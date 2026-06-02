import { error as errorResponse } from '../utils/responseHelper.js';
import TenantSubscription from '../models/TenantSubscription.js';

// ============================================================
// SUBSCRIPTION STATUS MAPPING
// ============================================================
//
// trialing  → full access (with optional trial banner)
// active    → full access
// overdue   → warning banner, can view but limited actions
// suspended → blocked from all non-billing operations
// expired   → completely blocked
// cancelled → allowed until period end, then expired

const STATUS_ACCESS = {
  trialing: {
    level: 'full',
    banner: true,
    bannerText: 'Trial period — upgrade to keep full access'
  },
  active: {
    level: 'full',
    banner: false
  },
  overdue: {
    level: 'limited',
    banner: true,
    bannerText: 'Subscription overdue — please make payment to continue using all features',
    blockedOperations: ['start_session', 'create_booking', 'create_resource', 'add_staff']
  },
  suspended: {
    level: 'billing_only',
    banner: true,
    bannerText: 'Access suspended due to non-payment. Contact support to restore access.',
    blockedOperations: ['all']
  },
  expired: {
    level: 'blocked',
    banner: true,
    bannerText: 'Subscription expired. Please contact support to renew.',
    blockedOperations: ['all']
  },
  cancelled: {
    level: 'full_until_end', // Full access until period end, then expired
    banner: true,
    bannerText: 'Subscription cancelled — access will end on {date}',
    blockedOperations: ['renew']
  }
};

// ============================================================
// SUBSCRIPTION GUARD MIDDLEWARE
// ============================================================

export const subscriptionGuard = async (req, res, next) => {
  try {
    // Skip for super admin
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      return next(); // No tenant context — let other middleware handle
    }

    // Find the active subscription for this tenant
    const subscription = await TenantSubscription.findOne({
      tenantId,
      status: { $in: ['trialing', 'active', 'overdue', 'suspended', 'expired', 'cancelled'] }
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return errorResponse(res, {
        statusCode: 402,
        message: 'No active subscription found. Please contact support.',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Safety net: if status is 'trialing' but trialEndDate has passed,
    // treat the subscription as expired even if the cron hasn't run yet
    if (subscription.status === 'trialing' && subscription.trialEndDate && new Date() > subscription.trialEndDate) {
      return errorResponse(res, {
        statusCode: 402,
        message: 'Trial period has ended. Please contact support to renew your subscription.',
        code: 'TRIAL_EXPIRED'
      });
    }

    const access = STATUS_ACCESS[subscription.status];

    if (!access) {
      return errorResponse(res, {
        statusCode: 500,
        message: 'Invalid subscription status.',
        code: 'INVALID_SUBSCRIPTION_STATUS'
      });
    }

    // Check if blocked
    if (access.level === 'blocked') {
      return errorResponse(res, {
        statusCode: 402,
        message: access.bannerText,
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    // Attach subscription info to request
    req.subscription = {
      status: subscription.status,
      planKey: subscription.planSnapshot?.key,
      level: access.level,
      banner: access.banner ? access.bannerText : null,
      blockedOperations: access.blockedOperations || []
    };

    // For billing_only level, only allow billing-related operations
    if (access.level === 'billing_only') {
      const billingPaths = ['/billing', '/subscription', '/settings', '/auth'];
      const isBillingRoute = billingPaths.some(path => req.originalUrl.includes(path));

      if (!isBillingRoute && req.method !== 'GET') {
        return errorResponse(res, {
          statusCode: 402,
          message: access.bannerText,
          code: 'SUBSCRIPTION_SUSPENDED'
        });
      }
    }

    // For limited level, check if the operation is blocked
    if (access.level === 'limited' && access.blockedOperations.length > 0) {
      const operation = extractOperation(req);
      if (operation && access.blockedOperations.includes(operation)) {
        return errorResponse(res, {
          statusCode: 402,
          message: access.bannerText,
          code: 'SUBSCRIPTION_OVERDUE'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================================
// HELPER: Extract operation from request
// ============================================================

const extractOperation = (req) => {
  // Map HTTP methods + paths to operations
  const method = req.method.toUpperCase();
  const path = req.originalUrl;

  if (method === 'POST' && path.includes('/sessions')) return 'start_session';
  if (method === 'POST' && path.includes('/bookings')) return 'create_booking';
  if (method === 'POST' && path.includes('/resources')) return 'create_resource';
  if (method === 'POST' && path.includes('/staff')) return 'add_staff';
  if (method === 'PATCH' && path.includes('/subscription/renew')) return 'renew';

  return null;
};

// ============================================================
// GET SUBSCRIPTION INFO (for response headers / dashboard)
// ============================================================

export const attachSubscriptionInfo = async (req, res, next) => {
  try {
    if (req.user && req.user.tenantId) {
      const subscription = await TenantSubscription.findOne({
        tenantId: req.user.tenantId,
        status: { $in: ['trialing', 'active', 'overdue', 'suspended', 'expired', 'cancelled'] }
      }).sort({ createdAt: -1 });

      if (subscription) {
        req.subscription = {
          status: subscription.status,
          planKey: subscription.planSnapshot?.key,
          currentPeriodEnd: subscription.currentPeriodEnd
        };
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default { subscriptionGuard, attachSubscriptionInfo };
