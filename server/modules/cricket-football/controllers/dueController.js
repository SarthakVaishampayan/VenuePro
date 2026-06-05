import mongoose from 'mongoose';
import CricketFootballDue from '../models/Due.js';
import CricketFootballPayment from '../models/Payment.js';
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
      if (result) break;
    } catch (e) {
      // Model not registered — try next
    }
  }
}

async function updateSessionPaymentStatusFromDues(sessionId) {
  try {
    const allDuesForSession = await CricketFootballDue.find({ bookingSessionId: sessionId });
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
      return;
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

    const dues = await CricketFootballDue.find(filter)
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
    const due = await CricketFootballDue.findOne({ _id: req.params.id, tenantId: req.tenantId })
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

    // Guard: check for existing active due for this session + customer
    const existingDue = await CricketFootballDue.findOne({
      bookingSessionId,
      customerId,
      status: { $in: ['pending', 'partial'] }
    });
    if (existingDue) {
      return error(res, {
        statusCode: 409,
        message: 'An active due already exists for this session and customer. Please pay or waive the existing due first.',
        code: 'DUPLICATE_DUE'
      });
    }

    // Guard: verify customerId matches the session's actual customer
    const session = await mongoose.model('CricketFootballBookingSession').findById(bookingSessionId).lean();
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }
    if (session.tenantId.toString() !== req.tenantId.toString()) {
      return error(res, { statusCode: 403, message: 'Session does not belong to this venue', code: 'FORBIDDEN' });
    }

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

    const due = await CricketFootballDue.create({
      tenantId: req.tenantId,
      customerId,
      bookingSessionId,
      amount,
      notes
    });

    await updateSessionPaymentStatus(bookingSessionId, 'due');

    await Player.findByIdAndUpdate(customerId, { $inc: { totalDue: amount } });

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
    const due = await CricketFootballDue.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!due) {
      return error(res, { statusCode: 404, message: 'Due not found', code: 'NOT_FOUND' });
    }

    if (due.status === 'paid' || due.status === 'waived') {
      return error(res, { statusCode: 400, message: `Due already ${due.status}`, code: 'ALREADY_PAID' });
    }

    const payAmount = amount || due.amount - due.paidAmount;
    const remainingAfter = (due.amount - due.paidAmount) - payAmount;

    const payment = await CricketFootballPayment.create({
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

    await updateSessionPaymentStatusFromDues(due.bookingSessionId);

    const player = await Player.findById(due.customerId);
    if (player) {
      const newTotalDue = Math.max(0, (player.totalDue || 0) - payAmount);
      player.totalDue = newTotalDue;
      await player.save();
    }

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
    const due = await CricketFootballDue.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!due) {
      return error(res, { statusCode: 404, message: 'Due not found', code: 'NOT_FOUND' });
    }

    if (due.status === 'paid' || due.status === 'waived') {
      return error(res, { statusCode: 400, message: `Due already ${due.status}`, code: 'ALREADY_PAID' });
    }

    const remainingAmount = due.amount - due.paidAmount;
    due.status = 'waived';
    await due.save();

    await updateSessionPaymentStatusFromDues(due.bookingSessionId);

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

/**
 * @swagger
 * /api/tenant/customers/:id/dues:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer's dues
 */
export const getCustomerDues = async (req, res, next) => {
  try {
    const dues = await CricketFootballDue.find({
      tenantId: req.tenantId,
      customerId: req.params.id
    })
      .populate('bookingSessionId', 'resourceNameSnapshot startTime')
      .sort({ createdAt: -1 })
      .lean();

    return success(res, { data: dues });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/customers/:id/pay-dues:
 *   post:
 *     tags: [Customers]
 *     summary: Pay all pending dues for a customer (full or partial)
 */
export const payCustomerDues = async (req, res, next) => {
  try {
    const { amount, mode, discount } = req.body;
    const player = await Player.findById(req.params.id);
    if (!player) {
      return error(res, { statusCode: 404, message: 'Customer not found', code: 'NOT_FOUND' });
    }

    const pendingDues = await CricketFootballDue.find({
      tenantId: req.tenantId,
      customerId: player._id,
      status: { $in: ['pending', 'partial'] }
    }).sort({ createdAt: 1 });

    if (pendingDues.length === 0) {
      return error(res, { statusCode: 400, message: 'No pending dues for this customer', code: 'NO_DUES' });
    }

    const totalRemaining = pendingDues.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Apply discount if provided — only allowed when paying the full remaining amount
    let discountAmount = 0;
    if (discount) {
      const parsedDiscount = Math.max(0, parseFloat(discount));
      const parsedAmount = amount ? parseFloat(amount) : totalRemaining;
      if (parsedAmount < totalRemaining) {
        return error(res, { statusCode: 400, message: 'Discount can only be applied when clearing the full due amount. Enter the full amount or remove the discount.', code: 'DISCOUNT_PARTIAL_NOT_ALLOWED' });
      }
      discountAmount = Math.min(parsedDiscount, totalRemaining);
    }

    const discountedTotal = totalRemaining - discountAmount;
    const payAmount = amount ? Math.min(Math.max(0, parseFloat(amount)), discountedTotal) : discountedTotal;

    if (payAmount <= 0 && discountAmount <= 0) {
      return error(res, { statusCode: 400, message: 'Invalid payment amount', code: 'INVALID_AMOUNT' });
    }

    // Distribute discount proportionally across dues
    let remainingDiscount = discountAmount;
    let remainingToPay = payAmount;
    const updatedDues = [];

    for (const due of pendingDues) {
      if (remainingToPay <= 0 && remainingDiscount <= 0) break;

      const dueRemaining = due.amount - due.paidAmount;

      // Apply proportional discount to this due
      let discountForThisDue = 0;
      if (remainingDiscount > 0 && totalRemaining > 0) {
        const proportion = dueRemaining / totalRemaining;
        if (remainingDiscount > 0 && proportion > 0) {
          discountForThisDue = Math.min(discountAmount * proportion, dueRemaining);
          if (remainingDiscount > 0 && discountForThisDue <= 0) {
            discountForThisDue = Math.min(remainingDiscount, dueRemaining);
          }
          remainingDiscount -= discountForThisDue;
        }
      }

      const effectiveDueRemaining = dueRemaining - discountForThisDue;
      const payForThisDue = Math.min(remainingToPay, effectiveDueRemaining);

      if (payForThisDue > 0) {
        await CricketFootballPayment.create({
          tenantId: req.tenantId,
          bookingSessionId: due.bookingSessionId,
          customerId: due.customerId,
          dueId: due._id,
          amount: payForThisDue,
          mode: mode || 'cash',
          type: 'due_payment',
          receivedBy: req.user.id,
          receivedByName: req.user.name || 'staff'
        });

        due.paidAmount += payForThisDue;
        due.partialPayments.push({ amount: payForThisDue, mode: mode || 'cash', paidAt: new Date() });
      }

      const totalCovered = (due.amount - due.paidAmount) - discountForThisDue;
      if (totalCovered <= 0) {
        due.status = 'paid';
        due.paidAt = new Date();
        due.paymentMode = mode || 'cash';
      } else if (due.paidAmount > 0) {
        due.status = 'partial';
      }

      await due.save();

      // Update session payment status
      const session = await mongoose.model('CricketFootballBookingSession').findById(due.bookingSessionId);
      if (session && ['pending', 'due', 'partial'].includes(session.paymentStatus)) {
        const allDuesForSession = await CricketFootballDue.find({ bookingSessionId: due.bookingSessionId });
        const allPaid = allDuesForSession.every(d => d.status === 'paid' || d.status === 'waived');
        session.paymentStatus = allPaid ? 'paid' : 'partial';
        await session.save();
      }

      remainingToPay -= payForThisDue;
      updatedDues.push(due);
    }

    const totalPaidOrDiscounted = payAmount + discountAmount;
    player.totalDue = Math.max(0, (player.totalDue || 0) - totalPaidOrDiscounted);
    await player.save();

    return success(res, {
      data: {
        customer: player,
        dues: updatedDues,
        totalPaid: payAmount,
        discountApplied: discountAmount,
        remainingDue: Math.max(0, totalRemaining - payAmount - discountAmount)
      },
      message: discountAmount > 0
        ? `₹${payAmount} paid (₹${discountAmount} discount applied) successfully`
        : `₹${payAmount} paid successfully`
    });
  } catch (err) {
    next(err);
  }
};
