// ============================================================
// DEMO CLEANUP CRON — Delete expired demo tenants
// ============================================================
// Runs every hour. Finds tenants with isDemo: true and
// demoExpiresAt <= now, then deletes all their data.

import Tenant from '../core/models/Tenant.js';
import { deleteDemoTenant } from '../core/services/demoSeedService.js';
import { logger } from '../core/config/logger.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Every hour

let intervalHandle = null;

export function startDemoCleanup() {
  logger.info('Demo cleanup cron scheduled (every 1 hour)');

  // Run immediately on startup
  runCleanup();

  // Then repeat every hour
  intervalHandle = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}

export function stopDemoCleanup() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Demo cleanup cron stopped');
  }
}

async function runCleanup() {
  try {
    const expired = await Tenant.find({
      isDemo: true,
      demoExpiresAt: { $lte: new Date() },
    });

    if (expired.length === 0) {
      logger.debug('Demo cleanup: no expired tenants found');
      return;
    }

    logger.info(`Demo cleanup: found ${expired.length} expired tenant(s)`);

    for (const tenant of expired) {
      try {
        await deleteDemoTenant(tenant._id);
        logger.info(`Demo cleanup: deleted tenant ${tenant.tenantCode} (${tenant.businessName})`);
      } catch (err) {
        logger.error(`Demo cleanup: failed to delete tenant ${tenant._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`Demo cleanup cron error: ${err.message}`);
  }
}
