import express from 'express';
import { superAdminAuth } from '../middleware/auth.js';
import { success as successResponse, paginationMeta } from '../utils/responseHelper.js';
import SubscriptionInvoice from '../models/SubscriptionInvoice.js';
import TenantSubscription from '../models/TenantSubscription.js';

const router = express.Router();

// ============================================================
// GET /api/platform/revenue
// ============================================================

/**
 * @swagger
 * /api/platform/revenue:
 *   get:
 *     tags: [Revenue]
 *     summary: Platform revenue overview
 *     description: MRR, ARR, total collected, and revenue breakdown
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue data
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalCollected,
      monthCollected,
      yearCollected,
      revenueByPlan,
      revenueByPaymentMode,
      monthlyRevenue,
      mrrResult,
      pendingResult,
      outstandingResult
    ] = await Promise.all([
      // Total collected ever
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      // This month
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      // This year
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: startOfYear, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      // By plan
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: '$planName', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      // By payment mode
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid', paymentMode: { $ne: null } } },
        { $group: { _id: '$paymentMode', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      // Monthly trend (last 12 months)
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } } },
        {
          $group: {
            _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      // MRR (sum of all active subscription amounts)
      TenantSubscription.aggregate([
        { $match: { status: { $in: ['active', 'trialing'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Pending invoices total
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'pending' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ]),
      // Overdue invoices + subscription overdue total
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'overdue' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ])
    ]);

    const mrr = mrrResult[0]?.total || 0;

    return successResponse(res, {
      data: {
        mrr,
        arr: mrr * 12,
        totalCollected: totalCollected[0]?.total || 0,
        totalTransactions: totalCollected[0]?.count || 0,
        thisMonth: {
          collected: monthCollected[0]?.total || 0,
          transactions: monthCollected[0]?.count || 0
        },
        thisYear: {
          collected: yearCollected[0]?.total || 0,
          transactions: yearCollected[0]?.count || 0
        },
        pendingInvoices: pendingResult[0]?.count || 0,
        pendingAmount: pendingResult[0]?.total || 0,
        outstandingInvoices: outstandingResult[0]?.count || 0,
        outstandingAmount: outstandingResult[0]?.total || 0,
        revenueByPlan,
        revenueByPaymentMode,
        monthlyTrend: monthlyRevenue.map(item => ({
          year: item._id.year,
          month: item._id.month,
          total: item.total,
          count: item.count
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/revenue/invoices
// ============================================================

/**
 * @swagger
 * /api/platform/revenue/invoices:
 *   get:
 *     tags: [Revenue]
 *     summary: List subscription invoices with pagination
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
router.get('/invoices', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const filter = {};
    if (req.query.status) filter.paymentStatus = req.query.status;

    const [invoices, total] = await Promise.all([
      SubscriptionInvoice.find(filter)
        .populate('tenantId', 'businessName tenantCode')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SubscriptionInvoice.countDocuments(filter)
    ]);

    // Map fields for frontend consumption
    const mapped = invoices.map(inv => ({
      ...inv,
      tenant: inv.tenantId,
      status: inv.paymentStatus,
      amount: inv.totalAmount
    }));

    return successResponse(res, {
      data: mapped,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
