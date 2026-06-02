// ============================================================
// TRIAL EXPIRY CRON — Auto-transition expired trials to overdue
// ============================================================
// Runs every hour. Finds subscriptions with status: 'trialing'
// and trialEndDate <= now, then transitions them to 'overdue'
// with a 7-day grace period.

import TenantSubscription from '../core/models/TenantSubscription.js';
import Tenant from '../core/models/Tenant.js';
import { logger } from '../core/config/logger.js';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Every hour

let intervalHandle = null;

export function startTrialExpiryCheck() {
  logger.info('Trial expiry cron scheduled (every 1 hour)');

  // Run immediately on startup
  runCheck();

  // Then repeat every hour
  intervalHandle = setInterval(runCheck, CHECK_INTERVAL_MS);
}

export function stopTrialExpiryCheck() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Trial expiry cron stopped');
  }
}

async function runCheck() {
  try {
    const now = new Date();

    // Find all trialing subscriptions where trialEndDate has passed
    const expiredTrials = await TenantSubscription.find({
      status: 'trialing',
      trialEndDate: { $lte: now }
    });

    if (expiredTrials.length === 0) {
      logger.debug('Trial expiry: no expired trials found');
      return;
    }

    logger.info(`Trial expiry: found ${expiredTrials.length} expired trial(s) to transition`);

    for (const sub of expiredTrials) {
      try {
        const tenantIdString = sub.tenantId?.toString();

        // Update subscription to overdue
        sub.status = 'overdue';
        sub.overdueSince = now;
        sub.overdueAmount = sub.amount || 0;
        sub.gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day grace period
        await sub.save();

        // Update tenant's subscription status
        if (tenantIdString) {
          await Tenant.findByIdAndUpdate(tenantIdString, {
            'subscription.status': 'overdue'
          });
        }

        logger.info(`Trial expiry: transitioned ${sub._id} (tenant: ${tenantIdString}) to overdue`);
      } catch (err) {
        logger.error(`Trial expiry: failed to transition ${sub._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Trial expiry cron error: ${err.message}`);
  }
}
