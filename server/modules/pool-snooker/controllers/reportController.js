import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import Expense from '../models/Expense.js';
import VenueResource from '../models/VenueResource.js';
import Player from '../../../core/models/Player.js';
import { success, error } from '../../../core/utils/responseHelper.js';

const getDateRange = (filter, req) => {
  const now = new Date();
  let start, end;

  switch (filter) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    case 'week':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()), 23, 59, 59, 999);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'custom':
      start = new Date(req.query.startDate || now);
      end = new Date(req.query.endDate || now);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return { start, end };
};

/**
 * @swagger
 * /api/tenant/reports/revenue:
 *   get:
 *     tags: [Reports]
 *     summary: Revenue report
 */
export const getRevenueReport = async (req, res, next) => {
  try {
    const { filter = 'today' } = req.query;
    const { start, end } = getDateRange(filter, req);

    const PaymentModel = getBusinessModel(req, 'Payment');
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const DueModel = getBusinessModel(req, 'Due');

    const [payments, sessions, pendingDues] = await Promise.all([
      PaymentModel.find({ tenantId: req.tenantId, createdAt: { $gte: start, $lte: end } }),
      BookingSessionModel.find({ tenantId: req.tenantId, bookingStatus: 'completed', endTime: { $gte: start, $lte: end } }),
      DueModel.find({ tenantId: req.tenantId, status: { $in: ['pending', 'partial'] } })
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const cashRevenue = payments.filter(p => p.mode === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const onlineRevenue = payments.filter(p => ['online', 'upi', 'card'].includes(p.mode)).reduce((sum, p) => sum + p.amount, 0);
    const totalPendingDues = pendingDues.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    return success(res, {
      data: {
        filter,
        totalRevenue,
        cashRevenue,
        onlineRevenue,
        pendingDues: totalPendingDues,
        totalSessions: sessions.length,
        paymentsCount: payments.length,
        avgPerSession: sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/reports/revenue-trend:
 *   get:
 *     tags: [Reports]
 *     summary: Daily/weekly/monthly revenue trend
 */
export const getRevenueTrend = async (req, res, next) => {
  try {
    const { period = 'daily', count = 7 } = req.query;
    const data = [];

    const PaymentModel = getBusinessModel(req, 'Payment');

    if (period === 'daily') {
      for (let i = parseInt(count) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        const payments = await PaymentModel.find({
          tenantId: req.tenantId,
          createdAt: { $gte: dayStart, $lte: dayEnd }
        });

        data.push({
          date: dayStart.toISOString().split('T')[0],
          label: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          revenue: payments.reduce((sum, p) => sum + p.amount, 0),
          cashRevenue: payments.filter(p => p.mode === 'cash').reduce((sum, p) => sum + p.amount, 0),
          onlineRevenue: payments.filter(p => ['online', 'upi', 'card'].includes(p.mode)).reduce((sum, p) => sum + p.amount, 0)
        });
      }
    } else if (period === 'monthly') {
      for (let i = parseInt(count) - 1; i >= 0; i--) {
        const date = new Date();
        const monthStart = new Date(date.getFullYear(), date.getMonth() - i, 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() - i + 1, 0, 23, 59, 59, 999);

        const payments = await PaymentModel.find({
          tenantId: req.tenantId,
          createdAt: { $gte: monthStart, $lte: monthEnd }
        });

        data.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: payments.reduce((sum, p) => sum + p.amount, 0),
          count: payments.length
        });
      }
    }

    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/reports/payment-split:
 *   get:
 *     tags: [Reports]
 *     summary: Payment mode split
 */
export const getPaymentSplit = async (req, res, next) => {
  try {
    const PaymentModel = getBusinessModel(req, 'Payment');
    const payments = await PaymentModel.find({ tenantId: req.tenantId });

    const split = {};
    payments.forEach(p => {
      split[p.mode] = (split[p.mode] || 0) + p.amount;
    });

    return success(res, {
      data: {
        split,
        total: payments.reduce((sum, p) => sum + p.amount, 0),
        count: payments.length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/reports/resource-usage:
 *   get:
 *     tags: [Reports]
 *     summary: Resource utilization report
 */
export const getResourceUsage = async (req, res, next) => {
  try {
    const resources = await VenueResource.find({ tenantId: req.tenantId });
    const usage = [];

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');

    for (const resource of resources) {
      const sessions = await BookingSessionModel.find({
        tenantId: req.tenantId,
        resourceId: resource._id,
        bookingStatus: 'completed'
      });

      const totalRevenue = sessions.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      const totalDuration = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      usage.push({
        resourceId: resource._id,
        resourceName: resource.name,
        category: resource.category,
        totalSessions: sessions.length,
        totalRevenue,
        totalDuration,
        avgRevenuePerSession: sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0,
        avgDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0
      });
    }

    usage.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return success(res, {
      data: {
        topEarning: usage[0] || null,
        leastUsed: usage[usage.length - 1] || null,
        allResources: usage
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/reports/expense-breakdown:
 *   get:
 *     tags: [Reports]
 *     summary: Expense breakdown by category
 */
export const getExpenseBreakdown = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ tenantId: req.tenantId });

    const breakdown = {};
    expenses.forEach(e => {
      if (!breakdown[e.category]) {
        breakdown[e.category] = { total: 0, count: 0 };
      }
      breakdown[e.category].total += e.amount;
      breakdown[e.category].count += 1;
    });

    return success(res, {
      data: {
        breakdown,
        total: expenses.reduce((sum, e) => sum + e.amount, 0),
        count: expenses.length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/reports/profit-loss:
 *   get:
 *     tags: [Reports]
 *     summary: Profit & loss statement
 */
export const getProfitLoss = async (req, res, next) => {
  try {
    const { filter = 'today' } = req.query;
    const { start, end } = getDateRange(filter, req);

    const PaymentModel = getBusinessModel(req, 'Payment');

    const [payments, expenses] = await Promise.all([
      PaymentModel.find({ tenantId: req.tenantId, createdAt: { $gte: start, $lte: end } }),
      Expense.find({ tenantId: req.tenantId, date: { $gte: start, $lte: end } })
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalExpenses;

    return success(res, {
      data: {
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit,
        profitMargin: totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
        paymentsCount: payments.length,
        expenseCount: expenses.length
      }
    });
  } catch (err) {
    next(err);
  }
};
