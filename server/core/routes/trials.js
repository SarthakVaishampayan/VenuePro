import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/tenantMiddleware.js';
import { auditLogMiddleware } from '../middleware/auditLogger.js';
import { success as successResponse, error as errorResponse, paginationMeta } from '../utils/responseHelper.js';
import Tenant from '../models/Tenant.js';
import TenantSubscription from '../models/TenantSubscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import SubscriptionInvoice from '../models/SubscriptionInvoice.js';
import auditService from '../services/auditService.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const extendTrialSchema = z.object({
  days: z.number().int().min(1).max(90),
  reason: z.string().max(500).optional()
});

const convertToPaidSchema = z.object({
  planKey: z.enum(['starter', 'professional', 'enterprise']).optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountReason: z.string().max(500).optional()
});

// ============================================================
// GET /api/platform/trials
// ============================================================

/**
 * @swagger
 * /api/platform/trials:
 *   get:
 *     tags: [Trials]
 *     summary: List all trialing tenants
 *     description: Get paginated list of tenants currently on trial
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: expiringSoon
 *         schema: { type: boolean }
 *         description: Filter trials expiring within 3 days
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of trial tenants
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const subscriptionFilter = { status: 'trialing' };

    // Filter trials expiring within 3 days
    if (req.query.expiringSoon === 'true') {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      subscriptionFilter.trialEndDate = { $lte: threeDaysFromNow };
    }

    // Search filter
    const tenantFilter = {};
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      tenantFilter.$or = [
        { businessName: searchRegex },
        { ownerName: searchRegex },
        { ownerEmail: searchRegex }
      ];
    }

    // First get matching tenant IDs
    let tenantIds = null;
    if (Object.keys(tenantFilter).length > 0) {
      const matchingTenants = await Tenant.find(tenantFilter).select('_id').lean();
      tenantIds = matchingTenants.map(t => t._id);
      if (tenantIds.length === 0) {
        return successResponse(res, {
          data: [],
          meta: paginationMeta(page, limit, 0)
        });
      }
      subscriptionFilter.tenantId = { $in: tenantIds };
    }

    const [subscriptions, total] = await Promise.all([
      TenantSubscription.find(subscriptionFilter)
        .populate({
          path: 'tenantId',
          select: 'businessName ownerName ownerEmail ownerPhone tenantCode timezone currency createdAt'
        })
        .sort({ trialEndDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TenantSubscription.countDocuments(subscriptionFilter)
    ]);

    // Format the data
    const trials = subscriptions
      .filter(sub => sub.tenantId) // Ensure tenant exists
      .map(sub => {
        const tenant = sub.tenantId;
        const now = new Date();
        const trialEnd = sub.trialEndDate ? new Date(sub.trialEndDate) : null;
        const daysRemaining = trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 0;

        return {
          _id: sub._id,
          tenant: {
            _id: tenant._id,
            businessName: tenant.businessName,
            ownerName: tenant.ownerName,
            ownerEmail: tenant.ownerEmail,
            ownerPhone: tenant.ownerPhone,
            tenantCode: tenant.tenantCode,
            timezone: tenant.timezone,
            createdAt: tenant.createdAt
          },
          plan: sub.planSnapshot,
          trialStartDate: sub.trialStartDate,
          trialEndDate: sub.trialEndDate,
          daysRemaining: Math.max(0, daysRemaining),
          isExpired: trialEnd ? trialEnd < now : false,
          isExpiringSoon: trialEnd ? (trialEnd - now) <= 3 * 24 * 60 * 60 * 1000 : false,
          status: sub.status
        };
      });

    return successResponse(res, {
      data: trials,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/trials/stats
// ============================================================

/**
 * @swagger
 * /api/platform/trials/stats:
 *   get:
 *     tags: [Trials]
 *     summary: Trial statistics for dashboard
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trial stats
 */
router.get('/stats', superAdminAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [totalTrials, expiringSoon, expired, converted] = await Promise.all([
      TenantSubscription.countDocuments({ status: 'trialing' }),
      TenantSubscription.countDocuments({
        status: 'trialing',
        trialEndDate: { $lte: threeDaysFromNow }
      }),
      TenantSubscription.countDocuments({
        status: 'trialing',
        trialEndDate: { $lte: now }
      }),
      TenantSubscription.countDocuments({
        status: 'active',
        'planSnapshot.key': { $ne: 'free' }
      })
    ]);

    return successResponse(res, {
      data: {
        totalTrials,
        expiringSoon,
        expired,
        converted,
        conversionRate: totalTrials > 0 ? Math.round((converted / (converted + totalTrials)) * 100) : 0
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/trials/:id/extend
// ============================================================

/**
 * @swagger
 * /api/platform/trials/{id}/extend:
 *   post:
 *     tags: [Trials]
 *     summary: Extend trial period by N days
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 90
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trial extended
 */
router.post('/:id/extend', superAdminAuth, validateObjectId('id'), validateBody(extendTrialSchema), auditLogMiddleware('update', 'trials'), async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id);
    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    if (subscription.status !== 'trialing') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Can only extend trials for subscriptions in trialing status.',
        code: 'NOT_TRIALING'
      });
    }

    const days = req.body.days;
    const previousEndDate = subscription.trialEndDate;

    // Extend trial end date
    subscription.trialEndDate = new Date(
      (subscription.trialEndDate || new Date()).getTime() + days * 24 * 60 * 60 * 1000
    );

    // Also extend current period end
    if (subscription.currentPeriodEnd) {
      subscription.currentPeriodEnd = new Date(
        subscription.currentPeriodEnd.getTime() + days * 24 * 60 * 60 * 1000
      );
    }

    await subscription.save();

    // Update tenant's subscription info
    await Tenant.findByIdAndUpdate(subscription.tenantId, {
      'subscription.trialEndsAt': subscription.trialEndDate,
      'subscription.currentPeriodEnd': subscription.currentPeriodEnd
    });

    // Audit log
    await auditService.log({
      actorId: req.user.id,
      actorRole: 'super_admin',
      actorName: req.user.name || 'Super Admin',
      tenantId: subscription.tenantId,
      action: 'trial_extended',
      module: 'trials',
      targetId: subscription._id,
      targetModel: 'TenantSubscription',
      description: `Trial extended by ${days} days. Reason: ${req.body.reason || 'Admin granted extension'}`
    });

    return successResponse(res, {
      message: `Trial extended by ${days} days successfully`,
      data: {
        previousEndDate,
        newEndDate: subscription.trialEndDate,
        daysAdded: days,
        reason: req.body.reason || null
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/trials/:id/convert
// ============================================================

/**
 * @swagger
 * /api/platform/trials/{id}/convert:
 *   post:
 *     tags: [Trials]
 *     summary: Convert trial to paid subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planKey:
 *                 type: string
 *                 enum: [starter, professional, enterprise]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, quarterly, yearly]
 *               discountPercent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Trial converted to paid
 */
router.post('/:id/convert', superAdminAuth, validateObjectId('id'), validateBody(convertToPaidSchema), auditLogMiddleware('update', 'trials'), async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id);
    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    if (subscription.status !== 'trialing') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Can only convert trials to paid subscriptions.',
        code: 'NOT_TRIALING'
      });
    }

    const planKey = req.body.planKey || subscription.planSnapshot?.key || 'starter';
    const billingCycle = req.body.billingCycle || subscription.billingCycle || 'monthly';

    // Get the plan
    const plan = await SubscriptionPlan.findByKey(planKey);
    if (!plan) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Plan '${planKey}' not found or inactive.`,
        code: 'PLAN_NOT_FOUND'
      });
    }

    const price = plan.prices[billingCycle] || plan.prices.monthly;
    const now = new Date();

    // Update subscription
    subscription.planId = plan._id;
    subscription.planSnapshot = {
      name: plan.name,
      key: plan.key,
      prices: plan.prices,
      limits: plan.limits
    };
    subscription.billingCycle = billingCycle;
    subscription.amount = price;
    subscription.status = 'active';
    subscription.trialEndDate = now;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    subscription.trialStartDate = subscription.trialStartDate || now;
    subscription.gracePeriodEnd = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000);

    // Apply discount if any
    if (req.body.discountPercent) {
      subscription.discountPercent = req.body.discountPercent;
      subscription.discountReason = req.body.discountReason || `Early conversion discount (${req.body.discountPercent}%)`;
    }

    // Generate invoice number (global sequential, not per-tenant)
    const year = now.getFullYear();
    const lastInvoice = await SubscriptionInvoice.findOne({
      invoiceNumber: new RegExp(`^VENUEPRO-${year}-`)
    }).sort({ invoiceNumber: -1 }).lean();
    let seq = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const invoiceNumber = `VENUEPRO-${year}-${String(seq).padStart(6, '0')}`;

    // Create invoice FIRST before updating subscription
    // This way if invoice creation fails, subscription stays in trialing status
    const invoice = await SubscriptionInvoice.create({
      invoiceNumber,
      tenantId: subscription.tenantId,
      tenantSubscriptionId: subscription._id,
      billingPeriodStart: now,
      billingPeriodEnd: subscription.currentPeriodEnd,
      billingCycle,
      planName: plan.name,
      lines: [{
        description: `${plan.name} Plan — ${billingCycle} billing`,
        quantity: 1,
        unitPrice: price,
        amount: price,
        type: 'subscription'
      }],
      subtotal: price,
      discountPercent: req.body.discountPercent || 0,
      discountAmount: req.body.discountPercent ? Math.round(price * req.body.discountPercent / 100) : 0,
      totalAmount: req.body.discountPercent
        ? price - Math.round(price * req.body.discountPercent / 100)
        : price,
      paymentStatus: 'pending',
      generatedBy: req.user.id
    });

    // NOW update subscription status (invoice is already created)
    await subscription.save();
    await Tenant.findByIdAndUpdate(subscription.tenantId, {
      'subscription.status': 'active',
      'subscription.trialEndsAt': now,
      'subscription.currentPeriodStart': now,
      'subscription.currentPeriodEnd': subscription.currentPeriodEnd,
      'subscription.billingCycle': billingCycle,
      maxBranches: plan.limits.branches || 1,
      maxResources: plan.limits.resources || 5,
      maxStaff: plan.limits.staff || 2
    });

    // Audit log
    await auditService.log({
      actorId: req.user.id,
      actorRole: 'super_admin',
      actorName: req.user.name || 'Super Admin',
      tenantId: subscription.tenantId,
      action: 'trial_converted',
      module: 'trials',
      targetId: subscription._id,
      targetModel: 'TenantSubscription',
      description: `Trial converted to ${plan.name} plan (${billingCycle})`
    });

    return successResponse(res, {
      message: `Trial converted to ${plan.name} plan successfully`,
      data: {
        subscription: subscription.toJSON(),
        invoice: invoice.toJSON()
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/trials/extend-by-one-click
// ============================================================

/**
 * @swagger
 * /api/platform/trials/one-click-extend/{id}:
 *   post:
 *     tags: [Trials]
 *     summary: One-click trial extension (for owner self-service)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trial extended
 */
router.post('/one-click-extend/:id', superAdminAuth, validateObjectId('id'), async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id);
    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    if (subscription.status !== 'trialing') {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Not in trial status.',
        code: 'NOT_TRIALING'
      });
    }

    // One-click extension gives 7 more days
    const days = 7;
    subscription.trialEndDate = new Date(
      (subscription.trialEndDate || new Date()).getTime() + days * 24 * 60 * 60 * 1000
    );

    if (subscription.currentPeriodEnd) {
      subscription.currentPeriodEnd = new Date(
        subscription.currentPeriodEnd.getTime() + days * 24 * 60 * 60 * 1000
      );
    }

    await subscription.save();

    await Tenant.findByIdAndUpdate(subscription.tenantId, {
      'subscription.trialEndsAt': subscription.trialEndDate
    });

    return successResponse(res, {
      message: 'Trial extended by 7 days',
      data: { newEndDate: subscription.trialEndDate }
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
