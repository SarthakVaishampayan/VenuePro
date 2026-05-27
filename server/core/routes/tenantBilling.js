import express from 'express';
import { tenantAuth } from '../middleware/auth.js';
import { success as successResponse, error as errorResponse, paginationMeta } from '../utils/responseHelper.js';
import Tenant from '../models/Tenant.js';
import TenantSubscription from '../models/TenantSubscription.js';
import SubscriptionInvoice from '../models/SubscriptionInvoice.js';

const router = express.Router();

// ============================================================
// GET /api/tenant/billing — Owner billing summary
// ============================================================

/**
 * @swagger
 * /api/tenant/billing:
 *   get:
 *     tags: [Tenant Billing]
 *     summary: Get tenant billing overview
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Billing overview
 */
router.get('/', tenantAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const [subscription, invoiceStats, recentInvoices] = await Promise.all([
      TenantSubscription.findOne({ tenantId })
        .populate('planId', 'name key prices')
        .sort({ createdAt: -1 })
        .lean(),

      SubscriptionInvoice.aggregate([
        { $match: { tenantId: tenantId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] } }, count: { $sum: 1 }, paidCount: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } } } }
      ]),

      SubscriptionInvoice.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    return successResponse(res, {
      data: {
        subscription,
        invoiceStats: invoiceStats[0] || { total: 0, paid: 0, pending: 0, count: 0, paidCount: 0 },
        recentInvoices
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/tenant/billing/subscription — Current subscription info
// ============================================================

router.get('/subscription', tenantAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const subscription = await TenantSubscription.findOne({ tenantId })
      .populate('planId', 'name key prices features limits')
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'No subscription found for this tenant.',
        code: 'NOT_FOUND'
      });
    }

    // Get tenant for currency info
    const tenant = await Tenant.findById(tenantId).select('currency timezone').lean();

    return successResponse(res, {
      data: {
        ...subscription,
        plan: subscription.planId,
        currency: tenant?.currency || 'INR',
        timezone: tenant?.timezone || 'Asia/Kolkata'
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/tenant/billing/invoices — Owner invoice list
// ============================================================

/**
 * @swagger
 * /api/tenant/billing/invoices:
 *   get:
 *     tags: [Tenant Billing]
 *     summary: Get tenant invoices with pagination
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
 *     responses:
 *       200:
 *         description: Paginated invoice list
 */
router.get('/invoices', tenantAuth, async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = { tenantId };

    if (req.query.status) {
      filter.paymentStatus = req.query.status;
    }

    const [invoices, total] = await Promise.all([
      SubscriptionInvoice.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SubscriptionInvoice.countDocuments(filter)
    ]);

    return successResponse(res, {
      data: invoices,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
