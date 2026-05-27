import express from 'express';
import { superAdminAuth } from '../middleware/auth.js';
import { success as successResponse } from '../utils/responseHelper.js';
import Tenant from '../models/Tenant.js';
import TenantSubscription from '../models/TenantSubscription.js';
import SubscriptionInvoice from '../models/SubscriptionInvoice.js';
import PlatformTicket from '../models/PlatformTicket.js';

const router = express.Router();

// ============================================================
// GET /api/platform/dashboard/stats
// ============================================================

/**
 * @swagger
 * /api/platform/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get platform dashboard stats
 *     description: KPI cards for super admin dashboard
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/stats', superAdminAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalTenants,
      activeTenants,
      trialingTenants,
      overdueTenants,
      totalRevenue,
      monthRevenue,
      totalTickets,
      openTickets
    ] = await Promise.all([
      Tenant.countDocuments({ isActive: true }),
      TenantSubscription.countDocuments({ status: 'active' }),
      TenantSubscription.countDocuments({ status: 'trialing' }),
      TenantSubscription.countDocuments({ status: 'overdue' }),
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      SubscriptionInvoice.aggregate([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      PlatformTicket.countDocuments(),
      PlatformTicket.countDocuments({ status: { $in: ['open', 'in_progress'] } })
    ]);

    // MRR calculation: sum of all active subscription amounts
    const mrrResult = await TenantSubscription.aggregate([
      { $match: { status: { $in: ['active', 'trialing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return successResponse(res, {
      data: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          trialing: trialingTenants,
          overdue: overdueTenants
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          thisMonth: monthRevenue[0]?.total || 0,
          mrr: mrrResult[0]?.total || 0,
          arr: (mrrResult[0]?.total || 0) * 12
        },
        support: {
          total: totalTickets,
          open: openTickets
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/dashboard/recent-activity
// ============================================================

/**
 * @swagger
 * /api/platform/dashboard/recent-activity:
 *   get:
 *     tags: [Dashboard]
 *     summary: Recent platform activity
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Recent activity
 */
router.get('/recent-activity', superAdminAuth, async (req, res, next) => {
  try {
    const recentTenants = await Tenant.find({ isActive: true })
      .select('businessName ownerName tenantCode createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return successResponse(res, {
      data: {
        recentTenants
      }
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
