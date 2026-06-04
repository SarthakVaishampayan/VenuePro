import mongoose from 'mongoose';
import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import Expense from '../models/Expense.js';
import Player from '../../../core/models/Player.js';
import { success, error } from '../../../core/utils/responseHelper.js';
import { startOfDay, endOfDay } from '../../../core/utils/dateHelper.js';

/**
 * @swagger
 * /api/tenant/dashboard:
 *   get:
 *     tags: [Tenant Dashboard]
 *     summary: Get dashboard stats
 */
export const getDashboard = async (req, res, next) => {
  try {
    // Cast tenantId to ObjectId explicitly — aggregate() does NOT auto-cast like find()
    const tenantId = new mongoose.Types.ObjectId(req.tenantId);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const PaymentModel = getBusinessModel(req, 'Payment');
    const DueModel = getBusinessModel(req, 'Due');
    const ResourceModel = getBusinessModel(req, 'Resource');

    const [
      activeSessions,
      totalResources,
      availableResources,
      todayPayments,
      todayExpenses,
      pendingDues,
      completedSessions
    ] = await Promise.all([
      BookingSessionModel.countDocuments({ tenantId, bookingStatus: 'in_progress' }),
      ResourceModel.countDocuments({ tenantId }),
      ResourceModel.countDocuments({ tenantId, status: 'available' }),
      PaymentModel.aggregate([
        { $match: { tenantId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { tenantId, date: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      DueModel.aggregate([
        { $match: { tenantId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } }
      ]),
      BookingSessionModel.countDocuments({ tenantId, bookingStatus: 'completed' })
    ]);

    const todayRevenue = todayPayments[0]?.total || 0;
    const todayExpenseTotal = todayExpenses[0]?.total || 0;
    const totalPendingDues = pendingDues[0]?.total || 0;

    // Get recent sessions
    const recentSessions = await BookingSessionModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('resourceId', 'name')
      .populate('customerId', 'fullName')
      .lean();

    return success(res, {
      data: {
        stats: {
          activeSessions,
          totalResources,
          availableResources,
          occupiedResources: totalResources - availableResources,
          todayRevenue,
          todayExpenses: todayExpenseTotal,
          todayProfit: todayRevenue - todayExpenseTotal,
          totalPendingDues,
          completedSessions,
          totalCustomers: await Player.countDocuments({ tenantId })
        },
        recentSessions: recentSessions.map(s => ({
          _id: s._id,
          resourceName: s.resourceNameSnapshot,
          customerName: s.customerNameSnapshot,
          status: s.bookingStatus,
          amount: s.finalAmount,
          paymentStatus: s.paymentStatus,
          duration: s.durationMinutes,
          createdAt: s.createdAt
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
