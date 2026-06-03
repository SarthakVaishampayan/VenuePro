import mongoose from 'mongoose';
import Due from '../models/Due.js';
import Payment from '../models/Payment.js';
import Player from '../../../core/models/Player.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';
import eventBus from '../../../core/events/eventBus.js';
import { EVENT_TYPES } from '../../../core/events/eventTypes.js';

/**
 * Helper: Update session paymentStatus across all registered session models
 */
const SESSION_MODEL_NAMES = ['BookingSession', 'PickleballBookingSession', 'CricketFootballBookingSession', 'GamingZoneBookingSession'];

async function updateSessionPaymentStatus(sessionId, status) {
  for (const modelName of SESSION_MODEL_NAMES) {
    try {
      const Model = mongoose.model(modelName);
      const result = await Model.findByIdAndUpdate(sessionId, { paymentStatus: status });
      if (result) break; // Only break if we actually updated a document
    } catch (e) {
      // Model not registered — try next
    }
  }
}

async function updateSessionPaymentStatusFromDues(sessionId) {
  try {
    const allDuesForSession = await Due.find({ bookingSessionId: sessionId });
    if (allDuesForSession.length === 0) return;

    const hasPending = allDuesForSession.some(d => d.status === 'pending');
    const hasPartial = allDuesForSession.some(d => d.status === 'partial');
    const allResolved = allDuesForSession.every(d => d.status === 'paid' || d.status === 'waived');

    let newStatus;
    if (allResolved) {
      newStatus = 'paid';
    } else if (hasPartial) {
      newStatus = 'partial';
    } else if (hasPending) {
      newStatus = 'due';
    } else {
      return; // Can't determine, don't change
    }

    for (const modelName of SESSION_MODEL_NAMES) {
      try {
        const Model = mongoose.model(modelName);
        const session = await Model.findById(sessionId);
        if (session) {
          session.paymentStatus = newStatus;
          await session.save();
          break;
        }
      } catch (e) {
        // Model not registered — skip
      }
    }
  } catch (e) {
    console.error('Failed to update session payment status from dues:', e);
  }
}

/**
 * @swagger
 * /api/tenant/dues:
 *   get:
 *     tags: [Dues]
 *     summary: List dues with status filter
 */
export const getAllDues = async (req, res, next) => {
  try {
    const { status, customerId } = req.query;
    const filter = { tenantId: req.tenantId };

    if (status) {
      if (status === 'active') {
        filter.status = { $in: ['pending', 'partial'] };
      } else {
        filter.status = status;
      }
    }
    if (customerId) filter.customerId = customerId;

    const dues = await Due.find(filter)
      .sort({ createdAt: -1 })
      .populate('customerId', 'fullName phone')
      .populate('bookingSessionId', 'resourceNameSnapshot startTime')
      .lean();

    return success(res, { data: dues });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/dues/:id:
 *   get:
 *     tags: [Dues]
 *     summary: Get due by ID
 */
export const getDueById = async (req, res, next) => {
  try {
    const due = await Due.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('customerId', 'fullName phone')
      .populate('bookingSessionId');
    if (!due) {
      return error(res, { statusCode: 404, message: 'Due not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: due });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/dues:
 *   post:
 *     tags: [Dues]
 *     summary: Create a due (pay later)
 */
export const createDue = async (req, res, next) => {
  try {
    const { bookingSessionId, customerId, amount, notes } = req.body;

    if (!bookingSessionId || !customerId || !amount) {
      return error(res, { statusCode: 400, message: 'Session, customer, and amount are required', code: 'MISSING_FIELDS' });
    }

    // Verify that the customerId matches the session's actual customer
    const BookingSession = mongoose.model('BookingSession');
    const session = await BookingSession.findById(bookingSessionId).lean();
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    if (session.tenantId.toString() !== req.tenantId.toString()) {
      return error(res, { statusCode: 403, message: 'Session does not belong to this venue', code: 'FORBIDDEN' });
    }

    // The customerId must match either the session's primary customer, secondary customer,
    // or payableCustomerId. If someone manually passes a different customer, reject it.
    const sessionCustomerIds = [
      session.customerId?.toString(),
      session.secondaryCustomerId?.toString(),
      session.payableCustomerId?.toString()
    ].filter(Boolean);

    const requestCustomerId = typeof customerId === 'string' ? customerId : customerId.toString();

    if (!sessionCustomerIds.includes(requestCustomerId)) {
      return error(res, {
        statusCode: 400,
        message: `Customer mismatch: this session belongs to ${session.customerNameSnapshot || 'another player'}. Cannot create a due for a different customer.`,
        code: 'CUSTOMER_MISMATCH'
      });
    }

    const due = await Due.create({
      tenantId: req.tenantId,
      customerId,
      bookingSessionId,
      amount,
      notes
    });

    // Update session payment status across all session models
    await updateSessionPaymentStatus(bookingSessionId, 'due');

    // Update customer totalDue
    await Player.findByIdAndUpdate(customerId, { $inc: { totalDue: amount } });

    // Emit due created event
    const customer = await Player.findById(customerId).lean();
    eventBus.emit(EVENT_TYPES.DUE_CREATED, {
      tenantId: req.tenantId,
      ownerUserId: req.user.id,
      dueId: due._id,
      amount,
      customerName: customer?.fullName || 'Unknown'
    });

    return created(res, { data: due });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/dues/:id/pay:
 *   post:
 *     tags: [Dues]
 *     summary: Pay a due (full or partial)
 */
export const payDue = async (req, res, next) => {
  try {
    const { amount, mode } = req.body;
    const due = await Due.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!due) {
      return error(res, { statusCode: 404, message: 'Due not found', code: 'NOT_FOUND' });
    }

    if (due.status === 'paid' || due.status === 'waived') {
      return error(res, { statusCode: 400, message: `Due already ${due.status}`, code: 'ALREADY_PAID' });
    }

    const payAmount = amount || due.amount - due.paidAmount;
    const remainingAfter = (due.amount - due.paidAmount) - payAmount;

    // Create payment record
    const payment = await Payment.create({
      tenantId: req.tenantId,
      bookingSessionId: due.bookingSessionId,
      customerId: due.customerId,
      dueId: due._id,
      amount: payAmount,
      mode: mode || 'cash',
      type: 'due_payment',
      receivedBy: req.user.id,
      receivedByName: req.user.name || 'owner'
    });

    // Update due
    due.paidAmount += payAmount;
    due.partialPayments.push({ amount: payAmount, mode: mode || 'cash', paidAt: new Date() });

    if (remainingAfter <= 0) {
      due.status = 'paid';
      due.paidAt = new Date();
      due.paymentMode = mode || 'cash';
    } else if (due.paidAmount > 0) {
      due.status = 'partial';
    }

    await due.save();

    // Update session payment status across all session models
    await updateSessionPaymentStatusFromDues(due.bookingSessionId);

    // Update customer totalDue
    const player = await Player.findById(due.customerId);
    if (player) {
      const newTotalDue = Math.max(0, (player.totalDue || 0) - payAmount);
      player.totalDue = newTotalDue;
      await player.save();
    }

    // Emit due paid event
    const fullPlayer = await Player.findById(due.customerId).lean();
    eventBus.emit(EVENT_TYPES.DUE_PAID, {
      tenantId: req.tenantId,
      ownerUserId: req.user.id,
      dueId: due._id,
      paymentId: payment._id,
      amount: payAmount,
      customerName: fullPlayer?.fullName || 'Unknown'
    });

    return success(res, { data: { due, payment } });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/dues/:id/waive:
 *   post:
 *     tags: [Dues]
 *     summary: Waive a due
 */
export const waiveDue = async (req, res, next) => {
  try {
    const due = await Due.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!due) {
      return error(res, { statusCode: 404, message: 'Due not found', code: 'NOT_FOUND' });
    }

    if (due.status === 'paid' || due.status === 'waived') {
      return error(res, { statusCode: 400, message: `Due already ${due.status}`, code: 'ALREADY_PAID' });
    }

    const remainingAmount = due.amount - due.paidAmount;
    due.status = 'waived';
    await due.save();

    // Update session payment status across all session models
    await updateSessionPaymentStatusFromDues(due.bookingSessionId);

    // Update customer totalDue
    const player = await Player.findById(due.customerId);
    if (player) {
      player.totalDue = Math.max(0, (player.totalDue || 0) - remainingAmount);
      await player.save();
    }

    return success(res, { data: due, message: 'Due waived successfully' });
  } catch (err) {
    next(err);
  }
};
