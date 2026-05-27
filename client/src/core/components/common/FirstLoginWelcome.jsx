import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from './Card';
import Button from './Button';
import { PartyPopper, ArrowRight, CheckCircle, Lock, Table2, Settings2, PlayCircle, LayoutDashboard, X } from 'lucide-react';

function getSteps(businessType) {
  const labels = {
    pool_snooker: { resource: 'Tables', resourceDesc: 'pool tables, snooker tables' },
    pickleball: { resource: 'Courts', resourceDesc: 'pickleball courts' },
    cricket_football: { resource: 'Turfs', resourceDesc: 'cricket/football turfs' },
    gaming_zone: { resource: 'Consoles', resourceDesc: 'gaming consoles, PCs, VR setups' }
  };
  const l = labels[businessType] || labels.pool_snooker;

  return [
    {
      title: 'Welcome to VenuePro!',
      description: 'Your venue management portal is ready. Let\'s get you set up in a few quick steps.',
      icon: PartyPopper
    },
    {
      title: 'Change Your Password',
      description: 'For security, please change your password to something only you know.',
      icon: Lock,
      action: { label: 'Change Password', path: '/owner/change-password' }
    },
    {
      title: `Set Up Your ${l.resource}`,
      description: `Add your ${l.resourceDesc}, and other resources with pricing.`,
      icon: Table2,
      action: { label: `Add ${l.resource}`, path: '/owner/resources' }
    },
    {
      title: 'Configure Settings',
      description: 'Set your business hours, pricing, and preferences.',
      icon: Settings2,
      action: { label: 'Open Settings', path: '/owner/settings' }
    },
    {
      title: 'Start Your First Session',
      description: 'Begin a session for a customer and start tracking revenue!',
      icon: PlayCircle,
      action: { label: 'Start Session', path: '/owner/sessions' }
    }
  ];
}

export default function FirstLoginWelcome({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  // Read business type from localStorage to show correct labels
  let businessType = 'pool_snooker';
  try {
    const saved = localStorage.getItem('ownerUser');
    if (saved) {
      const u = JSON.parse(saved);
      if (u.businessType) businessType = u.businessType;
    }
  } catch {}

  const welcomeSteps = getSteps(businessType);
  const step = welcomeSteps[currentStep];

  const handleNext = () => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleAction = (path) => {
    if (currentStep < welcomeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
    navigate(path);
  };

  const handleComplete = () => {
    // Mark welcome as completed so it doesn't show again
    try {
      const saved = localStorage.getItem('ownerUser');
      if (saved) {
        const u = JSON.parse(saved);
        u.firstLogin = false;
        localStorage.setItem('ownerUser', JSON.stringify(u));
      }
    } catch {}
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fadeIn">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {welcomeSteps.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'bg-emerald-500 w-8'
                  : i < currentStep
                  ? 'bg-emerald-300'
                  : 'bg-surface-tertiary'
              }`}
            />
          ))}
        </div>

        <Card className="text-center">
          <div className="py-4">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              {currentStep < welcomeSteps.length - 1 ? (
                step.icon ? <step.icon className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  : <PartyPopper className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>

            <h2 className="text-xl font-bold text-text-primary mb-2">{step.title}</h2>
            <p className="text-text-muted mb-6 max-w-sm mx-auto">{step.description}</p>

            {step.action ? (
              <Button onClick={() => handleAction(step.action.path)}>
                {step.action.label}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleNext}>
                {currentStep < welcomeSteps.length - 1 ? 'Get Started' : 'Go to Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {/* End Demo / Go to Dashboard — always visible on every step */}
            <div className="mt-6 pt-4 border-t border-border">
              <button
                onClick={handleComplete}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium
                  bg-surface-tertiary text-text-muted hover:text-text-primary hover:bg-surface-tertiary/80 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        </Card>

        {/* Skip button */}
        {currentStep > 0 && (
          <div className="text-center mt-4">
            <button onClick={handleSkip} className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Skip tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
