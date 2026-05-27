import { clsx } from 'clsx';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Watermark — Free plan branding component
 * 
 * Shows "Powered by VenuePro" with an upgrade CTA on receipts, booking confirmations,
 * and other customer-facing pages for free plan tenants.
 * 
 * Props:
 * - showUpgradeCta: Boolean to show/hide the upgrade link
 * - ctaLink: Link for the upgrade button
 * - variant: 'bar' | 'stamp' | 'footer'
 * - className: Additional CSS classes
 * - onUpgradeClick: Optional callback for upgrade click
 */
export default function Watermark({
  showUpgradeCta = true,
  ctaLink = '/pricing',
  variant = 'footer',
  className,
  onUpgradeClick
}) {
  const upgradeLink = (
    <Link
      to={ctaLink}
      onClick={onUpgradeClick}
      className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
    >
      <Sparkles className="w-3 h-3" />
      Upgrade to remove →{variant === 'footer' ? ' watermark' : ''}
    </Link>
  );

  const variants = {
    bar: (
      <div className={clsx(
        'flex items-center justify-center gap-2 py-2 px-4',
        'bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-primary-500/10',
        'border-y border-primary-500/20',
        className
      )}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-400">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span className="text-xs text-text-muted tracking-wider">Powered by <span className="font-semibold text-primary-500">VenuePro</span></span>
        {showUpgradeCta && (
          <span className="ml-2">{upgradeLink}</span>
        )}
      </div>
    ),
    stamp: (
      <div className={clsx(
        'absolute -rotate-12 opacity-[0.08] pointer-events-none select-none',
        'text-2xl font-bold tracking-[0.3em] uppercase text-gray-800 dark:text-gray-200',
        className
      )}>
        VenuePro
      </div>
    ),
    footer: (
      <div className={clsx(
        'text-center py-3 px-4 border-t border-border',
        className
      )}>
        <div className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="text-[11px] text-text-muted tracking-wider">
            Powered by <span className="font-semibold text-primary-500">VenuePro</span>
          </span>
        </div>
        {showUpgradeCta && (
          <div className="mt-1">{upgradeLink}</div>
        )}
      </div>
    )
  };

  return variants[variant] || variants.footer;
}

/**
 * WatermarkStamp — Full-page watermark overlay for receipts
 * Used on printed receipts for free plan tenants.
 */
export function WatermarkStamp({ className }) {
  return (
    <div className={clsx(
      'fixed inset-0 flex items-center justify-center pointer-events-none',
      className
    )}>
      <div className="text-[120px] font-bold text-gray-200 dark:text-gray-800 opacity-20 -rotate-12 select-none tracking-widest">
        VenuePro
      </div>
    </div>
  );
}
