import Player from '../../../core/models/Player.js';
import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';
import { startOfDay, endOfDay } from '../../../core/utils/dateHelper.js';
import eventBus from '../../../core/events/eventBus.js';
import { EVENT_TYPES } from '../../../core/events/eventTypes.js';

/**
 * @swagger
 * /api/tenant/payments:
 *   get:
 *     tags: [Payments]
 *     summary: List all payments
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const PaymentModel = getBusinessModel(req, 'Payment');
    const { mode, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (mode) filter.mode = mode;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      // Parse as local date (split string) — prevents UTC midnight interpretation
      if (dateFrom) {
        const [y, m, d] = dateFrom.split('-').map(Number);
        filter.createdAt.$gte = new Date(y, m - 1, d);
      }
      if (dateTo) {
        const [y, m, d] = dateTo.split('-').map(Number);
        filter.createdAt.$lte = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
    }

    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'fullName phone')
        .populate('bookingSessionId', 'resourceNameSnapshot finalAmount')
        .lean(),
      PaymentModel.countDocuments(filter)
    ]);

    // Round amounts to fix floating point artifacts in stored data
    const rounded = payments.map(p => ({ ...p, amount: Math.round(p.amount * 100) / 100 }));

    return success(res, {
      data: rounded,
      meta: { total, page: parseInt(page), limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record a payment
 */
export const recordPayment = async (req, res, next) => {
  try {
    const PaymentModel = getBusinessModel(req, 'Payment');
    const { bookingSessionId, customerId, amount, mode, notes } = req.body;

    if (!customerId || !amount || !mode) {
      return error(res, { statusCode: 400, message: 'Customer, amount, and mode are required', code: 'MISSING_FIELDS' });
    }

    const payment = await PaymentModel.create({
      tenantId: req.tenantId,
      bookingSessionId: bookingSessionId || null,
      customerId,
      amount,
      mode,
      notes,
      type: 'payment',
      receivedBy: req.user.id,
      receivedByName: req.user.name || 'owner'
    });

    // Update session payment status if linked
    if (bookingSessionId) {
      try {
        const BookingSessionModel = getBusinessModel(req, 'BookingSession');
        const session = await BookingSessionModel.findById(bookingSessionId);
        if (session && session.bookingStatus === 'completed') {
          session.paymentStatus = 'paid';
          await session.save();
        }
      } catch (e) {
        // Business type may not have BookingSession — skip
      }
    }

    // Emit payment received event for notification dispatch
    const customer = await Player.findById(customerId).lean();
    eventBus.emit(EVENT_TYPES.PAYMENT_RECEIVED, {
      tenantId: req.tenantId,
      ownerUserId: req.user.id,
      paymentId: payment._id,
      amount,
      mode,
      customerName: customer?.fullName || 'Unknown',
      customerEmail: customer?.email || 'no-email@example.com',
      tenantName: req.tenantName || ''
    });

    return created(res, { data: payment });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/payments/daily-summary:
 *   get:
 *     tags: [Payments]
 *     summary: Get daily payment summary
 */
export const getDailySummary = async (req, res, next) => {
  try {
    const PaymentModel = getBusinessModel(req, 'Payment');
    const { date, dateFrom, dateTo } = req.query;
    let dayStart, dayEnd;
    const { range } = req.query;
    if (range === 'all') {
      // No date filter — return all-time totals
      dayStart = null;
      dayEnd = null;
    } else if (dateFrom || dateTo) {
      // Range query — parse as local dates
      if (dateFrom) {
        const [y, m, d] = dateFrom.split('-').map(Number);
        dayStart = startOfDay(new Date(y, m - 1, d));
      } else {
        dayStart = startOfDay();
      }
      if (dateTo) {
        const [y, m, d] = dateTo.split('-').map(Number);
        dayEnd = endOfDay(new Date(y, m - 1, d));
      } else {
        dayEnd = endOfDay();
      }
    } else if (date) {
      const [y, m, d] = date.split('-').map(Number);
      const localDate = new Date(y, m - 1, d);
      dayStart = startOfDay(localDate);
      dayEnd = endOfDay(localDate);
    } else {
      dayStart = startOfDay();
      dayEnd = endOfDay();
    }

    // Build query filter
    const queryFilter = { tenantId: req.tenantId };
    if (dayStart !== null && dayEnd !== null) {
      queryFilter.createdAt = { $gte: dayStart, $lte: dayEnd };
    }
    const payments = await PaymentModel.find(queryFilter);

    const total = payments.reduce((sum, p) => sum + Math.round(p.amount * 100) / 100, 0);
    const byMode = {};
    payments.forEach(p => {
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;
    });

    return success(res, {
      data: {
        date: dayStart ? dayStart.toISOString().split('T')[0] : 'all',
        total,
        count: payments.length,
        byMode
      }
    });
  } catch (err) {
    next(err);
  }
};
