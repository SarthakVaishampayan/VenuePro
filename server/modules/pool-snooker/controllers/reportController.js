import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import Expense from '../models/Expense.js';
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
 * Helper: Get sessions ending in a date range + all payments for those sessions.
 * Revenue is attributed by session endTime, not payment createdAt.
 * This ensures Resource Usage = Total Revenue always.
 */
const getSessionsAndPayments = async (req, start, end) => {
  const BookingSessionModel = getBusinessModel(req, 'BookingSession');
  const PaymentModel = getBusinessModel(req, 'Payment');

  // Get completed sessions that ended in the date range
  const sessions = await BookingSessionModel.find({
    tenantId: req.tenantId,
    bookingStatus: 'completed',
    endTime: { $gte: start, $lte: end }
  }).lean();

  // Get all payments for those sessions
  const sessionIds = sessions.map(s => s._id).filter(Boolean);
  const payments = sessionIds.length > 0
    ? await PaymentModel.find({ bookingSessionId: { $in: sessionIds } }).lean()
    : [];

  return { sessions, payments };
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

    const DueModel = getBusinessModel(req, 'Due');

    const [{ sessions, payments }, pendingDues] = await Promise.all([
      getSessionsAndPayments(req, start, end),
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
    const { period = 'daily', count = 7, filter } = req.query;
    const data = [];

    // Determine the date range: use filter if provided, else default to last N days
    let rangeStart, rangeEnd;

    if (filter && ['week', 'month', 'custom'].includes(filter)) {
      const range = getDateRange(filter, req);
      rangeStart = range.start;
      rangeEnd = range.end;
    } else if (filter === 'today' || filter === 'yesterday' || !filter) {
      // Default: last N days
      const now = new Date();
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (parseInt(count) - 1));
      rangeStart.setHours(0, 0, 0, 0);
    }

    // Generate daily data within the range
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const { payments } = await getSessionsAndPayments(req, dayStart, dayEnd);

      data.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: payments.reduce((sum, p) => sum + p.amount, 0),
        cashRevenue: payments.filter(p => p.mode === 'cash').reduce((sum, p) => sum + p.amount, 0),
        onlineRevenue: payments.filter(p => ['online', 'upi', 'card'].includes(p.mode)).reduce((sum, p) => sum + p.amount, 0)
      });
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
    const { filter } = req.query;

    let payments = [];
    if (filter && filter !== 'all') {
      const { start, end } = getDateRange(filter, req);
      const result = await getSessionsAndPayments(req, start, end);
      payments = result.payments;
    } else {
      // All time: get all payments (no date filter)
      const PaymentModel = getBusinessModel(req, 'Payment');
      payments = await PaymentModel.find({ tenantId: req.tenantId }).lean();
    }

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
    const { filter } = req.query;
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const PaymentModel = getBusinessModel(req, 'Payment');
    const ResourceModel = getBusinessModel(req, 'Resource');

    // Build date filter
    let dateFilter = {};
    if (filter && filter !== 'all') {
      const { start, end } = getDateRange(filter, req);
      dateFilter = { endTime: { $gte: start, $lte: end } };
    }

    // Step 1: Get all completed sessions in the date range
    const sessions = await BookingSessionModel.find({
      tenantId: req.tenantId,
      bookingStatus: 'completed',
      ...dateFilter
    }).lean();

    // Step 2: Get all payments for those sessions (use Payment model so revenue
    // matches Total Revenue exactly — avoids discrepancy where session finalAmount
    // differs from actual payments collected)
    const sessionIds = sessions.map(s => s._id).filter(Boolean);
    const payments = sessionIds.length > 0
      ? await PaymentModel.find({ bookingSessionId: { $in: sessionIds } }).lean()
      : [];

    // Build a map: sessionId -> total collected
    const paymentBySession = {};
    payments.forEach(p => {
      const key = p.bookingSessionId?.toString();
      if (key) paymentBySession[key] = (paymentBySession[key] || 0) + p.amount;
    });

    // Step 3: Group sessions by resource, using payment amounts for revenue
    const resourceMap = {};
    sessions.forEach(s => {
      const rid = s.resourceId?.toString();
      if (!rid) return;
      if (!resourceMap[rid]) {
        resourceMap[rid] = {
          resourceId: s.resourceId,
          resourceName: s.resourceNameSnapshot || 'Unknown',
          totalSessions: 0,
          totalRevenue: 0,
          totalDuration: 0
        };
      }
      const r = resourceMap[rid];
      r.totalSessions += 1;
      r.totalRevenue += paymentBySession[s._id.toString()] || 0;
      r.totalDuration += s.durationMinutes || 0;
    });

    // Enrich with resource details (category) for resources that still exist
    const usedResourceIds = Object.keys(resourceMap);
    let resourceDetails = {};
    if (usedResourceIds.length > 0) {
      const resources = await ResourceModel.find({
        _id: { $in: usedResourceIds },
        tenantId: req.tenantId
      }).lean();
      resources.forEach(r => { resourceDetails[r._id.toString()] = r; });
    }

    const data = Object.values(resourceMap).map(r => ({
      resourceId: r.resourceId,
      resourceName: resourceDetails[r.resourceId?.toString()]?.name || r.resourceName,
      category: resourceDetails[r.resourceId?.toString()]?.category || 'standard',
      totalSessions: r.totalSessions,
      totalRevenue: r.totalRevenue,
      totalDuration: r.totalDuration,
      avgRevenuePerSession: r.totalSessions > 0 ? Math.round(r.totalRevenue / r.totalSessions) : 0,
      avgDuration: r.totalSessions > 0 ? Math.round(r.totalDuration / r.totalSessions) : 0
    }));

    // Also include resources with no completed sessions in the filtered period
    const usedIds = new Set(usedResourceIds);
    const unusedResources = await ResourceModel.find({
      tenantId: req.tenantId,
      _id: { $nin: [...usedIds] }
    }).lean();

    unusedResources.forEach(r => {
      data.push({
        resourceId: r._id,
        resourceName: r.name,
        category: r.category,
        totalSessions: 0,
        totalRevenue: 0,
        totalDuration: 0,
        avgRevenuePerSession: 0,
        avgDuration: 0
      });
    });

    data.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return success(res, {
      data: {
        topEarning: data[0] || null,
        leastUsed: data.length > 0 ? data[data.length - 1] : null,
        allResources: data
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
    const { filter } = req.query;

    let query = { tenantId: req.tenantId };
    if (filter && filter !== 'all') {
      const { start, end } = getDateRange(filter, req);
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query);

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

    const [{ payments }, expenses] = await Promise.all([
      getSessionsAndPayments(req, start, end),
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
