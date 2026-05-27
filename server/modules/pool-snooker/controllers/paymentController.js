import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Player from '../../../core/models/Player.js';
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
    const { mode, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (mode) filter.mode = mode;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const limitNum = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNum;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'fullName phone')
        .populate('bookingSessionId', 'resourceNameSnapshot finalAmount')
        .lean(),
      Payment.countDocuments(filter)
    ]);

    return success(res, {
      data: payments,
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
    const { bookingSessionId, customerId, amount, mode, notes } = req.body;

    if (!customerId || !amount || !mode) {
      return error(res, { statusCode: 400, message: 'Customer, amount, and mode are required', code: 'MISSING_FIELDS' });
    }

    const payment = await Payment.create({
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
    // Try all registered booking session models (different per business type)
    if (bookingSessionId) {
      const modelNames = ['BookingSession', 'PickleballBookingSession', 'CricketFootballBookingSession', 'GamingZoneBookingSession'];
      for (const modelName of modelNames) {
        try {
          const Model = mongoose.model(modelName);
          const session = await Model.findById(bookingSessionId);
          if (session && session.bookingStatus === 'completed') {
            session.paymentStatus = 'paid';
            await session.save();
            break;
          }
        } catch (e) {
          // Model not registered for this tenant's modules — skip
        }
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
    const { date } = req.query;
    const dayStart = date ? startOfDay(new Date(date)) : startOfDay();
    const dayEnd = date ? endOfDay(new Date(date)) : endOfDay();

    const payments = await Payment.find({
      tenantId: req.tenantId,
      createdAt: { $gte: dayStart, $lte: dayEnd }
    });

    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const byMode = {};
    payments.forEach(p => {
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;
    });

    return success(res, {
      data: {
        date: dayStart.toISOString().split('T')[0],
        total,
        count: payments.length,
        byMode
      }
    });
  } catch (err) {
    next(err);
  }
};
