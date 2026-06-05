import mongoose from 'mongoose';
import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import Expense from '../models/Expense.js';
import Player from '../../../core/models/Player.js';
import StaffUser from '../models/StaffUser.js';
import StaffShift from '../models/StaffShift.js';
import Branch from '../models/Branch.js';
import { success } from '../../../core/utils/responseHelper.js';

const getDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
  return { start, end };
};

/**
 * @swagger
 * /api/tenant/analytics/customer-lifetime-value:
 *   get:
 *     tags: [Analytics]
 *     summary: Customer lifetime value analysis
 */
export const getCustomerLifetimeValue = async (req, res, next) => {
  try {
    const { limit = 20, minSessions = 3 } = req.query;
    const min = parseInt(minSessions);

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');

    // Cast tenantId for aggregate() — does NOT auto-cast like find()
    const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);

    // Get all customers who have completed sessions
    const sessions = await BookingSessionModel.aggregate([
      { $match: { tenantId: tenantObjectId, bookingStatus: 'completed' } },
      { $group: {
        _id: '$customerId',
        sessionCount: { $sum: 1 },
        totalSpent: { $sum: '$finalAmount' },
        firstSession: { $min: '$startTime' },
        lastSession: { $max: '$startTime' },
        avgSessionValue: { $avg: '$finalAmount' }
      }},
      { $match: { sessionCount: { $gte: min } } },
      { $sort: { totalSpent: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Enrich with customer names
    const customerIds = sessions.map(s => s._id);
    const customers = await Player.find({ _id: { $in: customerIds } })
      .select('fullName customerCode phone email')
      .lean();

    const customerMap = {};
    customers.forEach(c => { customerMap[c._id.toString()] = c; });

    const data = sessions.map(s => {
      const customer = customerMap[s._id.toString()];
      const daysBetween = s.firstSession && s.lastSession
        ? Math.ceil((s.lastSession - s.firstSession) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        customerId: s._id,
        customerName: customer?.fullName || 'Unknown',
        customerCode: customer?.customerCode || '',
        phone: customer?.phone || '',
        sessionCount: s.sessionCount,
        totalSpent: s.totalSpent,
        avgSessionValue: Math.round(s.avgSessionValue),
        firstSession: s.firstSession,
        lastSession: s.lastSession,
        daysActive: daysBetween,
        valuePerDay: daysBetween > 0 ? Math.round(s.totalSpent / daysBetween) : s.totalSpent
      };
    });

    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/analytics/peak-hours:
 *   get:
 *     tags: [Analytics]
 *     summary: Peak hours analysis - hourly session distribution
 */
export const getPeakHours = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = getDateRange(dateFrom, dateTo);

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const sessions = await BookingSessionModel.find({
      tenantId: req.tenantId,
      startTime: { $gte: start, $lte: end },
      bookingStatus: { $in: ['completed', 'in_progress'] }
    }).lean();

    // Hourly breakdown
    const hourly = {};
    for (let i = 0; i < 24; i++) hourly[i] = { hour: i, count: 0, revenue: 0, label: `${i.toString().padStart(2, '0')}:00` };

    sessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      if (hourly[hour]) {
        hourly[hour].count += 1;
        hourly[hour].revenue += s.finalAmount || 0;
      }
    });

    const hourlyData = Object.values(hourly);
    const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
    const peakHour = hourlyData.reduce((a, b) => a.count > b.count ? a : b);

    // Day of week breakdown
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekly = {};
    dayNames.forEach((d, i) => { weekly[i] = { day: d, index: i, count: 0, revenue: 0 }; });

    sessions.forEach(s => {
      const day = new Date(s.startTime).getDay();
      if (weekly[day]) {
        weekly[day].count += 1;
        weekly[day].revenue += s.finalAmount || 0;
      }
    });

    const weeklyData = Object.values(weekly);

    return success(res, {
      data: {
        hourly: hourlyData,
        weekly: weeklyData,
        peakHour: { hour: peakHour.hour, label: peakHour.label, count: peakHour.count },
        totalSessions: sessions.length,
        maxHourlyCount: maxCount
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/analytics/resource-heatmap:
 *   get:
 *     tags: [Analytics]
 *     summary: Resource utilization heatmap
 */
export const getResourceHeatmap = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = getDateRange(dateFrom, dateTo);

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const ResourceModel = getBusinessModel(req, 'Resource');

    const sessions = await BookingSessionModel.find({
      tenantId: req.tenantId,
      startTime: { $gte: start, $lte: end },
      bookingStatus: { $in: ['completed', 'in_progress'] }
    }).lean();

    // Aggregate sessions by resourceId, using resourceNameSnapshot as fallback
    const sessionGroups = {};
    sessions.forEach(s => {
      const rid = s.resourceId?.toString();
      if (!rid) return;
      if (!sessionGroups[rid]) {
        sessionGroups[rid] = {
          resourceId: s.resourceId,
          resourceName: s.resourceNameSnapshot || 'Unknown',
          sessions: []
        };
      }
      sessionGroups[rid].sessions.push(s);
    });

    // Enrich with resource details (category) for resources that still exist
    const resourceIds = Object.values(sessionGroups).map(g => g.resourceId).filter(Boolean);
    let resourceMap = {};
    if (resourceIds.length > 0) {
      const resources = await ResourceModel.find({
        _id: { $in: resourceIds },
        tenantId: req.tenantId
      }).lean();
      resources.forEach(r => { resourceMap[r._id.toString()] = r; });
    }

    const heatmap = Object.values(sessionGroups).map(group => {
      const resourceInfo = resourceMap[group.resourceId?.toString()];
      const resourceSessions = group.sessions;

      // Hourly utilization for this resource
      const hourlyUtil = {};
      for (let i = 0; i < 24; i++) {
        hourlyUtil[i] = { hour: i, count: 0, label: `${i.toString().padStart(2, '0')}:00` };
      }

      resourceSessions.forEach(s => {
        const hour = new Date(s.startTime).getHours();
        if (hourlyUtil[hour]) hourlyUtil[hour].count += 1;
      });

      const totalMinutes = resourceSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

      return {
        resourceId: group.resourceId,
        resourceName: resourceInfo?.name || group.resourceName,
        category: resourceInfo?.category || 'standard',
        totalSessions: resourceSessions.length,
        totalMinutes,
        avgDuration: resourceSessions.length > 0 ? Math.round(totalMinutes / resourceSessions.length) : 0,
        totalRevenue: resourceSessions.reduce((sum, s) => sum + (s.finalAmount || 0), 0),
        utilizationRate: Object.values(hourlyUtil).filter(h => h.count > 0).length / 24,
        hourlyUtilization: Object.values(hourlyUtil)
      };
    });

    return success(res, { data: heatmap });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/analytics/staff-performance:
 *   get:
 *     tags: [Analytics]
 *     summary: Staff performance metrics
 */
export const getStaffPerformance = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = getDateRange(dateFrom, dateTo);

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const staff = await StaffUser.find({ tenantId: req.tenantId, isActive: true }).lean();
    const sessions = await BookingSessionModel.find({
      tenantId: req.tenantId,
      startTime: { $gte: start, $lte: end },
      bookingStatus: 'completed'
    }).lean();

    const data = staff.map(s => {
      const staffSessions = sessions.filter(ses =>
        (ses.createdBy?.toString() === s._id.toString()) ||
        (ses.createdByUserId?.toString() === s._id.toString())
      );
      const totalRevenue = staffSessions.reduce((sum, ses) => sum + (ses.finalAmount || 0), 0);
      const avgSessionValue = staffSessions.length > 0
        ? Math.round(totalRevenue / staffSessions.length) : 0;

      return {
        staffId: s._id,
        name: s.name,
        role: s.role,
        phone: s.phone,
        monthlySalary: s.monthlySalary,
        sessionCount: staffSessions.length,
        totalRevenue,
        avgSessionValue,
        paymentsReceived: staffSessions.reduce((sum, ses) => sum + (ses.payments?.length || 0), 0),
        roi: s.monthlySalary > 0 ? Math.round((totalRevenue / s.monthlySalary) * 100) : 0
      };
    }).filter(s => s.sessionCount > 0 || s.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/analytics/profit-loss-by-branch:
 *   get:
 *     tags: [Analytics]
 *     summary: P&L breakdown by branch
 */
export const getProfitLossByBranch = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const { start, end } = getDateRange(dateFrom, dateTo);

    const PaymentModel = getBusinessModel(req, 'Payment');
    const branches = await Branch.find({ tenantId: req.tenantId }).lean();
    const all = branches.length > 0;

    // If no branches, treat entire venue as a single "branch"
    const branchList = all ? branches : [{ _id: null, name: 'Main Venue', code: 'MAIN' }];

    const data = await Promise.all(branchList.map(async (branch) => {
      const branchFilter = { tenantId: req.tenantId };
      if (branch._id) branchFilter.branchId = branch._id;

      const [payments, expenses] = await Promise.all([
        PaymentModel.find({
          ...branchFilter,
          createdAt: { $gte: start, $lte: end }
        }).lean(),
        Expense.find({
          tenantId: req.tenantId,
          ...(branch._id ? { branchId: branch._id } : {}),
          date: { $gte: start, $lte: end }
        }).lean()
      ]);

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const profit = totalRevenue - totalExpenses;

      // Category breakdown
      const expenseCategories = {};
      expenses.forEach(e => {
        if (!expenseCategories[e.category]) expenseCategories[e.category] = 0;
        expenseCategories[e.category] += e.amount;
      });

      const paymentModes = {};
      payments.forEach(p => {
        if (!paymentModes[p.mode]) paymentModes[p.mode] = 0;
        paymentModes[p.mode] += p.amount;
      });

      return {
        branchId: branch._id,
        branchName: branch.name,
        branchCode: branch.code,
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin: totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
        paymentCount: payments.length,
        expenseCount: expenses.length,
        expenseCategories,
        paymentModes
      };
    }));

    // Totals
    const totals = data.reduce((acc, branch) => ({
      totalRevenue: acc.totalRevenue + branch.totalRevenue,
      totalExpenses: acc.totalExpenses + branch.totalExpenses,
      profit: acc.profit + branch.profit,
      totalPayments: acc.totalPayments + branch.paymentCount,
      totalExpensesCount: acc.totalExpensesCount + branch.expenseCount
    }), { totalRevenue: 0, totalExpenses: 0, profit: 0, totalPayments: 0, totalExpensesCount: 0 });

    return success(res, { data: { branches: data, totals } });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/analytics/custom-range:
 *   get:
 *     tags: [Analytics]
 *     summary: Custom date range analytics
 */
export const getCustomRangeAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, compareStart, compareEnd } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const PaymentModel = getBusinessModel(req, 'Payment');
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const DueModel = getBusinessModel(req, 'Due');

    const [payments, expenses, sessions, dues, customers] = await Promise.all([
      PaymentModel.find({ tenantId: req.tenantId, createdAt: { $gte: start, $lte: end } }).lean(),
      Expense.find({ tenantId: req.tenantId, date: { $gte: start, $lte: end } }).lean(),
      BookingSessionModel.find({ tenantId: req.tenantId, startTime: { $gte: start, $lte: end } }).lean(),
      DueModel.find({ tenantId: req.tenantId, status: { $in: ['pending', 'partial'] } }).lean(),
      Player.countDocuments({ tenantId: req.tenantId, createdAt: { $lte: end } })
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalDues = dues.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    const completedSessions = sessions.filter(s => s.bookingStatus === 'completed').length;

    // Comparison period
    let comparison = null;
    if (compareStart && compareEnd) {
      const { start: compStart, end: compEnd } = getDateRange(compareStart, compareEnd);
      const compPayments = await PaymentModel.find({
        tenantId: req.tenantId, createdAt: { $gte: compStart, $lte: compEnd }
      }).lean();
      const compRevenue = compPayments.reduce((sum, p) => sum + p.amount, 0);
      const revenueChange = compRevenue > 0 ? Math.round(((totalRevenue - compRevenue) / compRevenue) * 100) : 0;
      comparison = { revenue: compRevenue, revenueChange };
    }

    // Payment mode breakdown
    const modeBreakdown = {};
    payments.forEach(p => {
      if (!modeBreakdown[p.mode]) modeBreakdown[p.mode] = { total: 0, count: 0 };
      modeBreakdown[p.mode].total += p.amount;
      modeBreakdown[p.mode].count += 1;
    });

    // Daily breakdown
    const dailyData = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      dailyData[key] = { date: key, revenue: 0, expenses: 0, sessions: 0 };
    }

    payments.forEach(p => {
      const key = new Date(p.createdAt).toISOString().split('T')[0];
      if (dailyData[key]) dailyData[key].revenue += p.amount;
    });

    expenses.forEach(e => {
      const key = new Date(e.date).toISOString().split('T')[0];
      if (dailyData[key]) dailyData[key].expenses += e.amount;
    });

    sessions.forEach(s => {
      const key = new Date(s.startTime).toISOString().split('T')[0];
      if (dailyData[key]) dailyData[key].sessions += 1;
    });

    return success(res, {
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          profit: totalRevenue - totalExpenses,
          profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 100) : 0,
          completedSessions,
          totalSessions: sessions.length,
          paymentCount: payments.length,
          expenseCount: expenses.length,
          pendingDues: totalDues
        },
        comparison,
        modeBreakdown,
        dailyData: Object.values(dailyData),
        daysInRange: Object.keys(dailyData).length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/analytics/export-csv:
 *   get:
 *     tags: [Analytics]
 *     summary: Export data as CSV
 */
export const exportCSV = async (req, res, next) => {
  try {
    const { type = 'payments', dateFrom, dateTo } = req.query;
    const { start, end } = getDateRange(dateFrom, dateTo);

    const PaymentModel = getBusinessModel(req, 'Payment');
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);

    let rows = [];
    let headers = [];

    if (type === 'payments') {
      const payments = await PaymentModel.find({
        tenantId: req.tenantId, createdAt: { $gte: start, $lte: end }
      }).populate('customerId', 'fullName customerCode').lean();

      headers = ['Date', 'Amount', 'Mode', 'Type', 'Customer Name', 'Customer Code', 'Received By', 'Notes'];
      rows = payments.map(p => [
        new Date(p.createdAt).toISOString().split('T')[0],
        p.amount,
        p.mode,
        p.type,
        p.customerId?.fullName || '',
        p.customerId?.customerCode || '',
        p.receivedByName || '',
        (p.notes || '').replace(/,/g, ';')
      ]);
    } else if (type === 'sessions') {
      const sessions = await BookingSessionModel.find({
        tenantId: req.tenantId, startTime: { $gte: start, $lte: end }
      }).populate('resourceId', 'name').lean();

      headers = ['Date', 'Resource', 'Customer', 'Duration (min)', 'Amount', 'Status', 'Payment Status'];
      rows = sessions.map(s => [
        new Date(s.startTime).toISOString().split('T')[0],
        s.resourceNameSnapshot || '',
        s.customerNameSnapshot || '',
        s.durationMinutes || 0,
        s.finalAmount || 0,
        s.bookingStatus,
        s.paymentStatus
      ]);
    } else if (type === 'expenses') {
      const expenses = await Expense.find({
        tenantId: req.tenantId, date: { $gte: start, $lte: end }
      }).lean();

      headers = ['Date', 'Description', 'Category', 'Amount', 'Payment Mode', 'Notes'];
      rows = expenses.map(e => [
        new Date(e.date).toISOString().split('T')[0],
        e.description,
        e.category,
        e.amount,
        e.paymentMode || 'cash',
        (e.notes || '').replace(/,/g, ';')
      ]);
    } else if (type === 'customers') {
      const customers = await Player.find({ tenantId: req.tenantId }).lean();

      headers = ['Name', 'Code', 'Phone', 'Email', 'Total Spent', 'Total Due', 'Sessions', 'Registered'];
      const sessionCounts = await BookingSessionModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: '$customerId', count: { $sum: 1 } } }
      ]);
      const sessionMap = {};
      sessionCounts.forEach(s => { sessionMap[s._id.toString()] = s.count; });

      rows = customers.map(c => [
        c.fullName || '',
        c.customerCode || '',
        c.phone || '',
        c.email || '',
        c.totalSpent || 0,
        c.totalDue || 0,
        sessionMap[c._id.toString()] || 0,
        c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : ''
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
