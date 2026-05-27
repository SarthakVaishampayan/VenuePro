import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  Check, ChevronRight, ChevronLeft, X, SkipForward,
  Sparkles, Settings, Users, Building2, PlayCircle, Star
} from 'lucide-react';
import Button from './Button';

const ONBOARDING_STEPS = [
  { key: 'welcome', label: 'Welcome', icon: Sparkles, description: 'Welcome to VenuePro! Let\'s get you started.' },
  { key: 'profile', label: 'Profile', icon: Building2, description: 'Set up your business details and preferences.' },
  { key: 'resources', label: 'Resources', icon: Settings, description: 'Add your first resource (table, court, turf, etc.).' },
  { key: 'staff', label: 'Staff', icon: Users, description: 'Invite your team members to manage operations.' },
  { key: 'settings', label: 'Settings', icon: Settings, description: 'Configure operating hours, pricing rules, and more.' },
  { key: 'tour', label: 'Tour', icon: PlayCircle, description: 'Take a quick tour of your dashboard and key features.' },
  { key: 'complete', label: 'All Set!', icon: Star, description: 'You\'re ready to start accepting bookings.' }
];

/**
 * OnboardingWizard — Step-by-step guided setup for new tenants
 * 
 * Props:
 * - open: Boolean to show/hide
 * - onClose: Function to close
 * - currentStep: Number (0-6)
 * - status: 'pending' | 'in_progress' | 'completed' | 'skipped'
 * - onStepChange: Function(number) to update step
 * - onComplete: Function to mark onboarding complete
 * - onSkip: Function to skip onboarding
 */
export default function OnboardingWizard({
  open,
  onClose,
  currentStep = 0,
  status = 'pending',
  onStepChange,
  onComplete,
  onSkip
}) {
  const [step, setStep] = useState(currentStep);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(currentStep || 0);
    }
  }, [open, currentStep]);

  if (!open) return null;

  const totalSteps = ONBOARDING_STEPS.length - 1; // Exclude 'complete' step
  const progress = Math.round((step / totalSteps) * 100);
  const isLastStep = step === ONBOARDING_STEPS.length - 1;
  const isFirstStep = step === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      const nextStep = Math.min(step + 1, totalSteps);
      setStep(nextStep);
      onStepChange?.(nextStep);
    }
  };

  const handlePrev = () => {
    const prevStep = Math.max(step - 1, 0);
    setStep(prevStep);
    onStepChange?.(prevStep);
  };

  const handleSkip = () => {
    onSkip?.();
    onClose?.();
  };

  const renderStepContent = () => {
    const current = ONBOARDING_STEPS[step];
    if (!current) return null;

    const stepContents = {
      welcome: (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Welcome to VenuePro!</h2>
          <p className="text-text-muted max-w-md mx-auto">
            We'll help you get set up in just a few steps. Let's start by setting up your business profile.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {['Quick setup', 'No credit card', 'Start free'].map((item) => (
              <div key={item} className="p-2 bg-surface-secondary rounded-lg text-xs font-medium text-text-primary">
                {item}
              </div>
            ))}
          </div>
        </div>
      ),
      profile: (
        <div className="space-y-4 py-4">
          <h3 className="font-semibold text-text-primary">Business Profile</h3>
          <p className="text-sm text-text-muted">Tell us about your business so we can personalize your experience.</p>
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-primary">✓ Business name</p>
            <p className="text-sm text-text-primary">✓ Business type / category</p>
            <p className="text-sm text-text-primary">✓ Contact information</p>
            <p className="text-sm text-text-primary">✓ Timezone & currency</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              💡 Tip: Choose the right business type — it determines how resources and bookings work.
            </p>
          </div>
        </div>
      ),
      resources: (
        <div className="space-y-4 py-4">
          <h3 className="font-semibold text-text-primary">Create Your First Resource</h3>
          <p className="text-sm text-text-muted">
            Resources are what customers book — tables, courts, turfs, lanes, or rooms. Add your first one now.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['Table', 'Court', 'Turf', 'Lane', 'Room', 'Other'].map((type) => (
              <div key={type} className="p-3 border border-border rounded-lg hover:border-primary-500 cursor-pointer transition-colors text-center">
                <p className="text-sm font-medium text-text-primary">{type}</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              💡 Tip: You can always add more resources later from the settings.
            </p>
          </div>
        </div>
      ),
      staff: (
        <div className="space-y-4 py-4">
          <h3 className="font-semibold text-text-primary">Invite Your Team</h3>
          <p className="text-sm text-text-muted">
            Add staff members to help manage bookings, handle payments, and keep things running smoothly.
          </p>
          <div className="p-4 bg-surface-secondary rounded-lg space-y-3">
            <p className="text-sm font-medium text-text-primary">Staff roles:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-text-muted">
                <Check className="w-4 h-4 text-emerald-500" />
                <span><strong className="text-text-primary">Admin</strong> — Full access to manage everything</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-text-muted">
                <Check className="w-4 h-4 text-emerald-500" />
                <span><strong className="text-text-primary">Operator</strong> — Manage bookings and sessions</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-text-muted">
                <Check className="w-4 h-4 text-emerald-500" />
                <span><strong className="text-text-primary">Staff</strong> — Limited access to specific tasks</span>
              </li>
            </ul>
          </div>
        </div>
      ),
      settings: (
        <div className="space-y-4 py-4">
          <h3 className="font-semibold text-text-primary">Configure Settings</h3>
          <p className="text-sm text-text-muted">Set up your preferences for smooth day-to-day operations.</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
              <span className="text-sm text-text-primary">Operating Hours</span>
              <span className="text-xs text-text-muted">9:00 AM - 11:00 PM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
              <span className="text-sm text-text-primary">Booking Interval</span>
              <span className="text-xs text-text-muted">60 minutes</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
              <span className="text-sm text-text-primary">Cancellation Policy</span>
              <span className="text-xs text-text-muted">Free up to 2 hours before</span>
            </div>
          </div>
        </div>
      ),
      tour: (
        <div className="space-y-4 py-4">
          <h3 className="font-semibold text-text-primary">Quick Tour</h3>
          <p className="text-sm text-text-muted">
            Let's take a quick look around your dashboard so you know where everything is.
          </p>
          <div className="space-y-3">
            {[
              { label: 'Dashboard', desc: 'View your daily stats, bookings, and revenue at a glance' },
              { label: 'Bookings', desc: 'Manage and track all customer bookings' },
              { label: 'Payments', desc: 'Handle payments, dues, and generate receipts' },
              { label: 'Reports', desc: 'View detailed reports and analytics' },
              { label: 'Staff Portal', desc: 'Manage your team and their permissions' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary-600">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      complete: (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">You're All Set!</h2>
          <p className="text-text-muted max-w-md mx-auto mb-4">
            Your business is ready to start accepting bookings and managing operations.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-2xl font-bold text-primary-600">✓</p>
              <p className="text-xs text-text-muted">Profile set up</p>
            </div>
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-2xl font-bold text-primary-600">✓</p>
              <p className="text-xs text-text-muted">Ready to go</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={Star}
            className="mt-6"
            onClick={() => { onComplete?.(); onClose?.(); }}
          >
            Go to Dashboard
          </Button>
        </div>
      )
    };

    return stepContents[current.key] || (
      <div className="text-center py-8 text-text-muted">
        Step content coming soon
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface rounded-2xl shadow-2xl border border-border animate-scaleIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Quick Setup</h2>
              <p className="text-xs text-text-muted">{progress}% complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={() => { onSkip?.(); onClose?.(); }}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-secondary flex-shrink-0">
          <div
            className="h-full bg-primary-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 overflow-x-auto flex-shrink-0">
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-shrink-0">
              <div className={clsx(
                'flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer',
                i === step
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-medium'
                  : i < step
                    ? 'text-emerald-600'
                    : 'text-text-muted'
              )}
                onClick={() => { if (i < step) { setStep(i); onStepChange?.(i); } }}
              >
                <div className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                  i === step ? 'bg-primary-500 text-white' :
                  i < step ? 'bg-emerald-500 text-white' :
                  'bg-surface-secondary text-text-muted'
                )}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < ONBOARDING_STEPS.length - 1 && (
                <div className={clsx(
                  'w-6 h-px mx-1',
                  i < step ? 'bg-emerald-400' : 'bg-border'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <div>
            {!isFirstStep && !isLastStep && (
              <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={handlePrev}>
                Back
              </Button>
            )}
          </div>
          <p className="text-xs text-text-muted">
            Step {Math.min(step + 1, ONBOARDING_STEPS.length)} of {ONBOARDING_STEPS.length}
          </p>
          <Button
            variant={isLastStep ? 'success' : 'primary'}
            size="sm"
            icon={isLastStep ? Star : ChevronRight}
            onClick={handleNext}
          >
            {isLastStep ? 'Get Started!' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
