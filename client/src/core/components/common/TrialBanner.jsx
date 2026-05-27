import { useState } from 'react';
import { clsx } from 'clsx';
import { Clock, AlertTriangle, X, ChevronRight, Sparkles, Calendar } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

/**
 * TrialBanner — Displays trial status on owner dashboard
 * 
 * Props:
 * - trial: Object with { daysRemaining, trialEndDate, status, planName }
 * - onUpgrade: Function to call when user clicks upgrade
 * - onExtend: Function to call for one-click extension
 * - onDismiss: Function to call when banner is dismissed
 */
export default function TrialBanner({ trial, onUpgrade, onExtend, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (!trial || dismissed) return null;

  const { daysRemaining, trialEndDate, status, planName } = trial;
  const isExpired = daysRemaining <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 3;

  // Only show for trialing tenants
  if (status !== 'trialing') return null;

  const bannerStyles = isExpired
    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    : isExpiringSoon
      ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
      : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';

  const Icon = isExpired ? AlertTriangle : Clock;
  const iconColor = isExpired
    ? 'text-red-600 dark:text-red-400'
    : isExpiringSoon
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-blue-600 dark:text-blue-400';

  const title = isExpired
    ? 'Your trial has ended'
    : isExpiringSoon
      ? `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
      : `${daysRemaining} days remaining in your trial`;

  const description = isExpired
    ? 'Upgrade to a paid plan to continue using all features without interruption.'
    : isExpiringSoon
      ? `Your free trial of ${planName || 'VenuePro'} ends on ${new Date(trialEndDate).toLocaleDateString()}. Upgrade now to keep access.`
      : `Enjoying ${planName || 'VenuePro'}? You have ${daysRemaining} days left to explore all features.`;

  return (
    <>
      <div className={clsx('relative border rounded-xl p-4 mb-6', bannerStyles)}>
        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-current opacity-50" />
          </button>
        )}

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={clsx('p-2 rounded-lg bg-white/50 dark:bg-black/20', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-3">
              <Button
                variant={isExpired ? 'primary' : 'success'}
                size="sm"
                icon={Sparkles}
                onClick={() => setShowUpgradeModal(true)}
              >
                {isExpired ? 'Upgrade Now' : 'View Plans'}
              </Button>

              {!isExpired && onExtend && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Calendar}
                  onClick={onExtend}
                >
                  Need more time?
                </Button>
              )}
            </div>
          </div>

          {/* Days badge */}
          {!isExpired && (
            <div className="hidden sm:flex flex-col items-center justify-center px-4 py-2 rounded-lg bg-white/50 dark:bg-black/20">
              <span className={clsx(
                'text-2xl font-bold',
                isExpiringSoon ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
              )}>
                {daysRemaining}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">days left</span>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Plans Modal */}
      <Modal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} title="Upgrade Your Plan" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Choose a plan that fits your business needs. Upgrade anytime to unlock more features.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Starter */}
            <div className="border border-border rounded-xl p-4 hover:border-primary-500 cursor-pointer transition-colors">
              <h3 className="font-semibold text-text-primary">Starter</h3>
              <p className="text-2xl font-bold text-text-primary mt-2">₹499<span className="text-sm font-normal text-text-muted">/mo</span></p>
              <ul className="mt-3 space-y-1.5">
                <li className="text-xs text-text-muted">Up to 3 resources</li>
                <li className="text-xs text-text-muted">Up to 2 staff accounts</li>
                <li className="text-xs text-text-muted">Basic reports</li>
              </ul>
              <Button size="sm" variant="primary" className="mt-4 w-full" onClick={() => { onUpgrade?.('starter'); setShowUpgradeModal(false); }}>
                Choose Starter
              </Button>
            </div>

            {/* Professional */}
            <div className="border-2 border-primary-500 rounded-xl p-4 relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary-500 text-white text-xs font-medium rounded-full">
                Popular
              </span>
              <h3 className="font-semibold text-text-primary">Professional</h3>
              <p className="text-2xl font-bold text-text-primary mt-2">₹1,499<span className="text-sm font-normal text-text-muted">/mo</span></p>
              <ul className="mt-3 space-y-1.5">
                <li className="text-xs text-text-muted">Up to 10 resources</li>
                <li className="text-xs text-text-muted">Up to 5 staff accounts</li>
                <li className="text-xs text-text-muted">Advanced reports & analytics</li>
                <li className="text-xs text-text-muted">Priority support</li>
              </ul>
              <Button size="sm" variant="success" className="mt-4 w-full" onClick={() => { onUpgrade?.('professional'); setShowUpgradeModal(false); }}>
                Choose Professional
              </Button>
            </div>

            {/* Enterprise */}
            <div className="border border-border rounded-xl p-4 hover:border-primary-500 cursor-pointer transition-colors">
              <h3 className="font-semibold text-text-primary">Enterprise</h3>
              <p className="text-2xl font-bold text-text-primary mt-2">₹2,999<span className="text-sm font-normal text-text-muted">/mo</span></p>
              <ul className="mt-3 space-y-1.5">
                <li className="text-xs text-text-muted">Unlimited resources</li>
                <li className="text-xs text-text-muted">Unlimited staff accounts</li>
                <li className="text-xs text-text-muted">All features + custom branding</li>
                <li className="text-xs text-text-muted">Dedicated account manager</li>
              </ul>
              <Button size="sm" variant="primary" className="mt-4 w-full" onClick={() => { onUpgrade?.('enterprise'); setShowUpgradeModal(false); }}>
                Choose Enterprise
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
