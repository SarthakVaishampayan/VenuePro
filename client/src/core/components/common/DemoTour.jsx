// ============================================================
// DEMO TOUR — Guided walkthrough for demo users
// ============================================================

import { useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Table2, Clock, Users, DollarSign, Wallet, FileText } from 'lucide-react';

const STEPS = [
  {
    title: 'Welcome to VenuePro!',
    description: 'This is a demo environment pre-loaded with sample data. Take a tour to see how everything works, or skip to explore on your own.',
    icon: Sparkles,
    color: 'indigo',
  },
  {
    title: 'Dashboard Overview',
    description: 'Your dashboard shows key metrics at a glance — active sessions, resource availability, today\'s revenue, and pending dues. All KPIs update in real-time.',
    icon: FileText,
    color: 'emerald',
    highlight: 'dashboard-stats',
  },
  {
    title: 'Manage Resources',
    description: 'Click "Resources" in the sidebar to view and manage your venue\'s tables, courts, or turfs. Each resource has its own pricing (day/night rates) and availability status.',
    icon: Table2,
    color: 'blue',
    highlight: 'nav-resources',
    navTo: '/owner/resources',
  },
  {
    title: 'Start a Session',
    description: 'Go to "Sessions" to start a new session. Select a resource, pick a customer, and start the timer. For court/turf venues, you can also set a fixed duration.',
    icon: Clock,
    color: 'amber',
    highlight: 'nav-sessions',
    navTo: '/owner/sessions',
  },
  {
    title: 'Track Customers & Dues',
    description: 'The "Customers" page lists all players with their booking history and win/loss records. "Dues" tracks unpaid amounts — partial payments and waive off supported.',
    icon: Users,
    color: 'violet',
    highlight: 'nav-customers',
    navTo: '/owner/customers',
  },
  {
    title: 'Record Payments',
    description: 'Use the "Payments" page to record cash or online payments. You can link payments to sessions or customers for complete financial tracking.',
    icon: DollarSign,
    color: 'rose',
    highlight: 'nav-payments',
    navTo: '/owner/payments',
  },
  {
    title: 'Manage Dues',
    description: 'The "Dues" page shows all outstanding amounts. You can collect full payment, accept partial payments, or waive dues for regular customers.',
    icon: Wallet,
    color: 'orange',
    highlight: 'nav-dues',
    navTo: '/owner/dues',
  },
  {
    title: 'Ready to Go!',
    description: 'You\'ve seen the key features! When you\'re ready, click "Sign Up Free" to create your own account and start using VenuePro for real.',
    icon: Sparkles,
    color: 'indigo',
    isLast: true,
  },
];

const COLORS = {
  indigo: { bg: 'bg-indigo-500', ring: 'ring-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50 dark:bg-indigo-900/20' },
  emerald: { bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-900/20' },
  blue: { bg: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-900/20' },
  amber: { bg: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-600', light: 'bg-amber-50 dark:bg-amber-900/20' },
  violet: { bg: 'bg-violet-500', ring: 'ring-violet-500', text: 'text-violet-600', light: 'bg-violet-50 dark:bg-violet-900/20' },
  rose: { bg: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-600', light: 'bg-rose-50 dark:bg-rose-900/20' },
  orange: { bg: 'bg-orange-500', ring: 'ring-orange-500', text: 'text-orange-600', light: 'bg-orange-50 dark:bg-orange-900/20' },
};

export default function DemoTour({ onComplete, onNavigate }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const colors = COLORS[current.color];

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      const nextStep = STEPS[next];
      if (nextStep.navTo && onNavigate) {
        onNavigate(nextStep.navTo);
      }
      setStep(next);
    }
  }, [step, onNavigate]);

  const handlePrev = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  const handleSkip = useCallback(() => {
    if (onComplete) onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      {/* Tutorial overlay hint */}
      <div className="absolute inset-0" onClick={handleSkip} />

      {/* Tour card */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn">
        {/* Progress bar */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${colors.light} flex items-center justify-center mb-5`}>
            <current.icon className={`w-7 h-7 ${colors.text}`} />
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? colors.bg : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{current.title}</h3>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{current.description}</p>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Skip
              </button>
              {current.isLast ? (
                <button
                  onClick={handleSkip}
                  className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Got it!
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
