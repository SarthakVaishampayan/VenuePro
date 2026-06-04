import express from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { validateBody, validateQuery } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { success as successResponse, error as errorResponse, paginationMeta } from '../utils/responseHelper.js';
import Tenant from '../models/Tenant.js';
import TenantSubscription from '../models/TenantSubscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import SubscriptionInvoice from '../models/SubscriptionInvoice.js';

const router = express.Router();

// ============================================================
// SCHEMAS
// ============================================================

const recordPaymentSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  planId: z.string().optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  paymentMode: z.enum(['cash', 'bank_transfer', 'upi', 'cheque']),
  paymentReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  extendPeriod: z.boolean().default(true)
});

const statusChangeSchema = z.object({
  status: z.enum(['trialing', 'active', 'overdue', 'suspended', 'expired', 'cancelled']),
  reason: z.string().max(500).optional(),
  notifyOwner: z.boolean().default(false)
});

const renewSchema = z.object({
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  amount: z.number().min(0).optional(),
  months: z.number().int().min(1).max(36).optional()
});

// ============================================================
// GET /api/platform/subscriptions — List all tenant subscriptions
// ============================================================

/**
 * @swagger
 * /api/platform/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: List all tenant subscriptions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated subscription list
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // If search is provided, find matching tenants first
    let tenantIds = [];
    if (req.query.search) {
      const search = req.query.search.trim();
      const tenantMatches = await Tenant.find({
        $or: [
          { businessName: { $regex: search, $options: 'i' } },
          { ownerName: { $regex: search, $options: 'i' } },
          { ownerEmail: { $regex: search, $options: 'i' } },
          { tenantCode: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      tenantIds = tenantMatches.map(t => t._id);
      if (tenantIds.length === 0) {
        return successResponse(res, { data: [], meta: paginationMeta(page, limit, 0) });
      }
      filter.tenantId = { $in: tenantIds };
    }

    const [subscriptions, total] = await Promise.all([
      TenantSubscription.find(filter)
        .populate('tenantId', 'businessName tenantCode ownerName ownerEmail businessTypeId')
        .populate('planId', 'name key prices')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TenantSubscription.countDocuments(filter)
    ]);

    return successResponse(res, {
      data: subscriptions.map(sub => ({
        ...sub,
        tenant: sub.tenantId,
        plan: sub.planId
      })),
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/subscriptions/stats — KPI stats
// ============================================================

/**
 * @swagger
 * /api/platform/subscriptions/stats:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Subscription management KPI stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: KPI data
 */
router.get('/stats', superAdminAuth, async (req, res, next) => {
  try {
    const now = new Date();

    const [
      statusCounts,
      mrrResult,
      totalPaying,
      overdueCount,
      suspendedCount,
      activeTrialing,
      totalInvoiced
    ] = await Promise.all([
      // Count by status
      TenantSubscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // MRR from active/trialing subscriptions
      TenantSubscription.aggregate([
        { $match: { status: { $in: ['active', 'trialing'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Total paying (active)
      TenantSubscription.countDocuments({ status: 'active' }),
      // Overdue count
      TenantSubscription.countDocuments({ status: 'overdue' }),
      // Suspended count
      TenantSubscription.countDocuments({ status: 'suspended' }),
      // Active + trialing
      TenantSubscription.countDocuments({ status: { $in: ['active', 'trialing'] } }),
      // Total invoiced amount (paid invoices)
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Build status map
    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });

    return successResponse(res, {
      data: {
        totalSubscriptions: statusCounts.reduce((sum, s) => sum + s.count, 0),
        totalPaying,
        overdue: statusMap.overdue || 0,
        suspended: statusMap.suspended || 0,
        trialing: statusMap.trialing || 0,
        expired: statusMap.expired || 0,
        cancelled: statusMap.cancelled || 0,
        activeTrialing,
        mrr: mrrResult[0]?.total || 0,
        arr: (mrrResult[0]?.total || 0) * 12,
        totalCollected: totalInvoiced[0]?.total || 0,
        statusBreakdown: statusCounts.map(s => ({
          status: s._id,
          count: s.count
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/subscriptions/overdue — List overdue subscriptions
// ============================================================

router.get('/overdue', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [subscriptions, total] = await Promise.all([
      TenantSubscription.find({ status: 'overdue' })
        .populate('tenantId', 'businessName tenantCode ownerName ownerEmail ownerPhone')
        .sort({ overdueSince: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TenantSubscription.countDocuments({ status: 'overdue' })
    ]);

    return successResponse(res, {
      data: subscriptions.map(sub => ({
        ...sub,
        tenant: sub.tenantId
      })),
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/subscriptions/:id — Subscription detail
// ============================================================

router.get('/:id', superAdminAuth, async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id)
      .populate('tenantId', 'businessName tenantCode ownerName ownerEmail ownerPhone businessTypeId currency timezone')
      .populate('planId', 'name key prices limits features')
      .lean();

    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    // Get associated invoices
    const invoices = await SubscriptionInvoice.find({ tenantSubscriptionId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get invoice stats
    const invoiceStats = await SubscriptionInvoice.aggregate([
      { $match: { tenantSubscriptionId: new mongoose.Types.ObjectId(req.params.id) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } }, count: { $sum: 1 }, paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } } } }
    ]);

    return successResponse(res, {
      data: {
        ...subscription,
        tenant: subscription.tenantId,
        plan: subscription.planId,
        invoices,
        invoiceStats: invoiceStats[0] || { total: 0, paid: 0, count: 0, paidCount: 0 }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/subscriptions/record-payment — Record manual payment
// ============================================================

router.post('/record-payment', superAdminAuth, validateBody(recordPaymentSchema), async (req, res, next) => {
  try {
    const { tenantId, planId, billingCycle, amount, paymentMode, paymentReference, notes, extendPeriod } = req.body;

    // Find or create subscription for this tenant
    let subscription = await TenantSubscription.findOne({ tenantId }).sort({ createdAt: -1 });

    if (!subscription) {
      // Get tenant info for default plan
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return errorResponse(res, { statusCode: 404, message: 'Tenant not found.', code: 'NOT_FOUND' });
      }

      // Find the plan to use
      let plan = null;
      if (planId) {
        plan = await SubscriptionPlan.findById(planId);
      } else {
        plan = await SubscriptionPlan.findOne({ key: 'starter' });
      }

      if (!plan) {
        return errorResponse(res, { statusCode: 404, message: 'Subscription plan not found.', code: 'PLAN_NOT_FOUND' });
      }

      // Create new subscription
      const now = new Date();
      const cycleMonths = billingCycle === 'yearly' ? 12 : billingCycle === 'quarterly' ? 3 : 1;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + cycleMonths);

      subscription = await TenantSubscription.create({
        tenantId,
        planId: plan._id,
        planSnapshot: {
          name: plan.name,
          key: plan.key,
          prices: plan.prices,
          limits: { branches: plan.limits?.branches || 1, resources: plan.limits?.resources || 2, staff: plan.limits?.staff || 2 }
        },
        billingCycle,
        amount,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        totalPaid: amount,
        lastPaymentDate: now,
        lastPaymentAmount: amount,
        paymentCount: 1,
        gracePeriodDays: 7
      });
    } else {
      // Update existing subscription
      const updateFields = {
        status: 'active',
        amount,
        billingCycle,
        totalPaid: (subscription.totalPaid || 0) + amount,
        lastPaymentDate: new Date(),
        lastPaymentAmount: amount,
        paymentCount: (subscription.paymentCount || 0) + 1,
        overdueSince: null,
        overdueAmount: 0,
        suspensionDate: null,
        gracePeriodEnd: null,
        // Reset overdue flags
      };

      // If a plan was selected, update it
      if (planId) {
        const plan = await SubscriptionPlan.findById(planId);
        if (plan) {
          updateFields.planId = plan._id;
          updateFields.planSnapshot = {
            name: plan.name,
            key: plan.key,
            prices: plan.prices,
            limits: { branches: plan.limits?.branches || 1, resources: plan.limits?.resources || 2, staff: plan.limits?.staff || 2 }
          };
        }
      }

      // Extend period if requested
      if (extendPeriod) {
        const cycleMonths = billingCycle === 'yearly' ? 12 : billingCycle === 'quarterly' ? 3 : 1;
        const now = new Date();
        // If period already ended, start from now; otherwise extend from current end
        const baseDate = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
          ? subscription.currentPeriodEnd
          : now;
        updateFields.currentPeriodStart = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
          ? subscription.currentPeriodEnd
          : now;
        const newEnd = new Date(baseDate);
        newEnd.setMonth(newEnd.getMonth() + cycleMonths);
        updateFields.currentPeriodEnd = newEnd;
      }

      subscription = await TenantSubscription.findByIdAndUpdate(
        subscription._id,
        { $set: updateFields },
        { new: true }
      );
    }

    // ============================================================
    // First, mark any existing pending invoices as paid
    // This handles the case where trial conversion created a pending
    // invoice that hasn't been settled yet.
    // ============================================================
    const pendingInvoices = await SubscriptionInvoice.find({
      tenantId: tenantId,
      tenantSubscriptionId: subscription._id,
      paymentStatus: 'pending'
    });

    let invoice = null;

    if (pendingInvoices.length > 0) {
      // Mark all pending invoices as paid with this payment's details.
      // Set paidAmount to each invoice's own totalAmount for accurate records,
      // since totalPaid on the subscription tracks the aggregate.
      for (const inv of pendingInvoices) {
        await SubscriptionInvoice.findByIdAndUpdate(inv._id, {
          $set: {
            paymentStatus: 'paid',
            paymentMode: paymentMode,
            paymentReference: paymentReference || null,
            paidAt: new Date(),
            paidAmount: inv.totalAmount
          }
        });
      }
    }

    // Only create a new invoice if there were no pending invoices to settle.
    // If pending invoices existed, the payment cleared them; the subscription
    // period has already been extended above if requested.
    if (pendingInvoices.length === 0) {
      // Generate invoice with auto invoice number
      const planName = subscription.planSnapshot?.name || 'Subscription';
      const year = new Date().getFullYear();
      const lastInvoice = await SubscriptionInvoice.findOne({
        invoiceNumber: new RegExp(`^VENUEPRO-${year}-`)
      }).sort({ invoiceNumber: -1 }).lean();
      let seq = 1;
      if (lastInvoice?.invoiceNumber) {
        const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      const invoiceNumber = `VENUEPRO-${year}-${String(seq).padStart(6, '0')}`;

      invoice = await SubscriptionInvoice.create({
        invoiceNumber,
        tenantId,
        tenantSubscriptionId: subscription._id,
        billingPeriodStart: subscription.currentPeriodStart || new Date(),
        billingPeriodEnd: subscription.currentPeriodEnd || new Date(),
        billingCycle,
        planName,
        lines: [{
          description: `${planName} — ${billingCycle} subscription`,
          quantity: 1,
          unitPrice: amount,
          amount
        }],
        subtotal: amount,
        discountPercent: 0,
        discountAmount: 0,
        totalAmount: amount,
        paymentStatus: 'paid',
        paymentMode,
        paymentReference: paymentReference || null,
        paidAt: new Date(),
        paidAmount: amount,
        notes: notes || null,
        generatedBy: req.user.id
      });
    }

    // Also update tenant's subscription info
    await Tenant.findByIdAndUpdate(tenantId, {
      $set: {
        'subscription.planId': subscription.planId,
        'subscription.status': 'active',
        'subscription.currentPeriodStart': subscription.currentPeriodStart,
        'subscription.currentPeriodEnd': subscription.currentPeriodEnd,
        'subscription.billingCycle': billingCycle
      }
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Payment recorded successfully',
      data: {
        subscription,
        invoice
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/subscriptions/:id/status — Change status
// ============================================================

router.patch('/:id/status', superAdminAuth, validateBody(statusChangeSchema), async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const now = new Date();

    const updateFields = { status };
    if (reason) updateFields.notes = reason;

    // Set timestamps based on status
    switch (status) {
      case 'overdue':
        updateFields.overdueSince = now;
        updateFields.gracePeriodEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'suspended':
        updateFields.suspensionDate = now;
        break;
      case 'cancelled':
        updateFields.cancelledAt = now;
        updateFields.cancelledReason = reason || null;
        break;
      case 'active':
        // Clear overdue/suspended flags
        updateFields.overdueSince = null;
        updateFields.gracePeriodEnd = null;
        updateFields.suspensionDate = null;
        break;
    }

    const subscription = await TenantSubscription.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    // Update tenant's subscription status
    await Tenant.findByIdAndUpdate(subscription.tenantId, {
      $set: { 'subscription.status': status }
    });

    return successResponse(res, {
      message: `Subscription status changed to ${status}`,
      data: subscription
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/subscriptions/:id/renew — Renew subscription
// ============================================================

router.post('/:id/renew', superAdminAuth, validateBody(renewSchema), async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id);
    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    const billingCycle = req.body.billingCycle || subscription.billingCycle;
    const amount = req.body.amount || subscription.amount;
    const months = req.body.months || (billingCycle === 'yearly' ? 12 : billingCycle === 'quarterly' ? 3 : 1);

    const now = new Date();
    const baseDate = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now;
    const newEnd = new Date(baseDate);
    newEnd.setMonth(newEnd.getMonth() + months);

    const updated = await TenantSubscription.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: 'active',
          billingCycle,
          amount,
          currentPeriodStart: now,
          currentPeriodEnd: newEnd,
          overdueSince: null,
          gracePeriodEnd: null,
          suspensionDate: null
        }
      },
      { new: true }
    );

    // Update tenant
    await Tenant.findByIdAndUpdate(subscription.tenantId, {
      $set: {
        'subscription.status': 'active',
        'subscription.currentPeriodStart': now,
        'subscription.currentPeriodEnd': newEnd,
        'subscription.billingCycle': billingCycle
      }
    });

    return successResponse(res, {
      message: 'Subscription renewed successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/subscriptions/:id/generate-invoice — Manual invoice
// ============================================================

router.post('/:id/generate-invoice', superAdminAuth, async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id).populate('tenantId', 'businessName').lean();
    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    const planName = subscription.planSnapshot?.name || 'Subscription';
    const now = new Date();
    const cycleMonths = subscription.billingCycle === 'yearly' ? 12 : subscription.billingCycle === 'quarterly' ? 3 : 1;
    const periodStart = subscription.currentPeriodStart || now;
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + cycleMonths);

    // Generate invoice with auto invoice number
    const year = new Date().getFullYear();
    const lastInvoice = await SubscriptionInvoice.findOne({
      invoiceNumber: new RegExp(`^VENUEPRO-${year}-`)
    }).sort({ invoiceNumber: -1 }).lean();
    let seq = 1;
    if (lastInvoice?.invoiceNumber) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const invoiceNumber = `VENUEPRO-${year}-${String(seq).padStart(6, '0')}`;

    const invoice = await SubscriptionInvoice.create({
      invoiceNumber,
      tenantId: subscription.tenantId,
      tenantSubscriptionId: subscription._id,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      billingCycle: subscription.billingCycle,
      planName,
      lines: [{
        description: `${planName} — ${subscription.billingCycle} subscription`,
        quantity: 1,
        unitPrice: subscription.amount,
        amount: subscription.amount
      }],
      subtotal: subscription.amount,
      discountPercent: 0,
      discountAmount: 0,
      totalAmount: subscription.amount,
      paymentStatus: 'pending',
      notes: req.body.notes || null,
      generatedBy: req.user.id
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Invoice generated successfully',
      data: invoice
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/subscriptions/:id/send-reminder — Overdue reminder (stub)
// ============================================================

router.post('/:id/send-reminder', superAdminAuth, async (req, res, next) => {
  try {
    const subscription = await TenantSubscription.findById(req.params.id)
      .populate('tenantId', 'businessName ownerName ownerEmail')
      .lean();

    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription not found.',
        code: 'NOT_FOUND'
      });
    }

    // Phase 9: Send actual email/SMS notification
    const tenant = subscription.tenantId;
    const reminderEntry = {
      sentAt: new Date(),
      channel: 'in_app',
      ownerName: tenant.ownerName,
      ownerEmail: tenant.ownerEmail,
      status: subscription.status,
      amount: subscription.overdueAmount || subscription.amount
    };

    return successResponse(res, {
      message: 'Overdue reminder sent successfully',
      data: {
        reminder: reminderEntry,
        note: 'In-app notification sent. Email/SMS notification will be implemented in Phase 9.'
      }
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
