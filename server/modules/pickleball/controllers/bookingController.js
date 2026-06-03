import mongoose from 'mongoose';
import Court from '../models/Court.js';
import BookingSession from '../models/BookingSession.js';
import Player from '../../../core/models/Player.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

const Payment = mongoose.model('Payment');
const Due = mongoose.model('Due');

const roundDownTo5Minutes = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  d.setMinutes(Math.floor(minutes / 5) * 5, 0, 0);
  return d;
};

const roundUpTo5Minutes = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const remainder = minutes % 5;
  if (remainder === 0) { d.setSeconds(0, 0); }
  else { d.setMinutes(minutes + (5 - remainder), 0, 0); }
  return d;
};

const calculateDurationMinutes = (start, end) => Math.round((end - start) / (1000 * 60));

const roundToNearest5 = (amount) => Math.round(amount / 5) * 5;

const getPricingMode = () => {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 6) ? 'night' : 'day';
};

export const getAllSessions = async (req, res, next) => {
  try {
    const { status, limit } = req.query;
    const filter = { tenantId: req.tenantId };
    if (status) filter.bookingStatus = status;

    let query = BookingSession.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(parseInt(limit));

    const sessions = await query.populate('resourceId').populate('customerId');
    return success(res, { data: sessions });
  } catch (err) {
    next(err);
  }
};

export const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await BookingSession.find({
      tenantId: req.tenantId,
      bookingStatus: { $in: ['in_progress'] }
    })
      .populate('resourceId')
      .populate('customerId')
      .sort({ startTime: -1 });

    return success(res, { data: sessions });
  } catch (err) {
    next(err);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const session = await BookingSession.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('resourceId')
      .populate('customerId');
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: session });
  } catch (err) {
    next(err);
  }
};

export const startSession = async (req, res, next) => {
  try {
    const { resourceId, customerId, customerName, customerUniqueId, secondaryCustomerId, secondaryCustomerName, duration } = req.body;

    if (!resourceId || !customerId) {
      return error(res, { statusCode: 400, message: 'Resource and customer are required', code: 'MISSING_FIELDS' });
    }

    const court = await Court.findOne({ _id: resourceId, tenantId: req.tenantId });
    if (!court) {
      return error(res, { statusCode: 404, message: 'Court not found', code: 'NOT_FOUND' });
    }

    // Resolve player from unified Player model
    let player = await Player.findById(customerId);
    if (!player) {
      return error(res, { statusCode: 404, message: 'Player not found', code: 'NOT_FOUND' });
    }

    // Track tenant visit for self-registered players
    const alreadyLinked = player.linkedTenants?.some(
      lt => lt.tenantId?.toString() === req.tenantId?.toString()
    );
    if (!alreadyLinked) {
      player.linkedTenants.push({
        tenantId: req.tenantId,
        linkedAt: new Date()
      });
      await player.save();
    }

    const activeSession = await BookingSession.findOne({
      tenantId: req.tenantId,
      resourceId,
      bookingStatus: { $in: ['in_progress'] }
    });
    if (activeSession) {
      return error(res, { statusCode: 400, message: 'Court already has an active session', code: 'ALREADY_ACTIVE' });
    }

    const now = new Date();
    const pricingMode = getPricingMode();

    // If duration provided, this is a timer-based session (booked slot)
    let endTime = null;
    let bookedDuration = 0;
    if (duration) {
      bookedDuration = parseInt(duration);
      if (bookedDuration < 15 || bookedDuration > 480) {
        return error(res, { statusCode: 400, message: 'Duration must be between 15 minutes and 8 hours', code: 'INVALID_DURATION' });
      }
      const roundedNow = roundDownTo5Minutes(now);
      endTime = new Date(roundedNow.getTime() + bookedDuration * 60000);
    }

    const session = await BookingSession.create({
      tenantId: req.tenantId,
      resourceId,
      resourceNameSnapshot: court.name,
      customerId: player._id,
      customerNameSnapshot: player.fullName,
      customerUniqueId: customerUniqueId || player.customerCode,
      secondaryCustomerId: secondaryCustomerId || null,
      secondaryCustomerNameSnapshot: secondaryCustomerName || null,
      startTime: now,
      startTimeRounded: roundDownTo5Minutes(now),
      endTime,
      bookedDuration,
      bookingStatus: 'in_progress',
      pricingModeAtStart: pricingMode,
      rateSnapshot: { dayPrice: court.dayPrice, nightPrice: court.nightPrice },
      dayPrice: court.dayPrice,
      nightPrice: court.nightPrice,
      pricingMode
    });

    court.status = 'occupied';
    await court.save();

    // Increment primary player's booking count
    player.totalBookings = (player.totalBookings || 0) + 1;
    await player.save();

    if (secondaryCustomerId) {
      await Player.findByIdAndUpdate(secondaryCustomerId, { $inc: { totalBookings: 1 } });
    }

    const populatedSession = await BookingSession.findById(session._id)
      .populate('resourceId')
      .populate('customerId');

    return created(res, { data: populatedSession });
  } catch (err) {
    next(err);
  }
};

export const endSession = async (req, res, next) => {
  try {
    const { payableCustomer, discount, discountReason, loserCustomerId } = req.body;
    const session = await BookingSession.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'NOT_FOUND' });
    }
    if (session.bookingStatus !== 'in_progress') {
      return error(res, { statusCode: 400, message: 'Session is not active', code: 'NOT_ACTIVE' });
    }

    const now = new Date();
    const endTimeRounded = roundUpTo5Minutes(now);

    // Use bookedDuration for timer-based sessions (pickleball/turf), 
    // otherwise calculate from actual elapsed time (pool/snooker)
    const duration = session.bookedDuration > 0
      ? session.bookedDuration
      : calculateDurationMinutes(session.startTimeRounded, endTimeRounded);

    const hourlyRate = (session.pricingModeAtStart || session.pricingMode) === 'night'
      ? (session.rateSnapshot?.nightPrice || session.nightPrice)
      : (session.rateSnapshot?.dayPrice || session.dayPrice);
    const rawAmount = (duration / 60) * hourlyRate;
    const roundedAmount = roundToNearest5(rawAmount);
    const discountAmount = Math.min(discount || 0, roundedAmount);
    const finalAmount = Math.max(0, roundedAmount - discountAmount);

    session.endTime = now;
    session.endTimeRounded = endTimeRounded;
    session.durationMinutes = duration;
    session.bookingStatus = 'completed';
    session.pricingModeAtEnd = getPricingMode();
    session.hourlyRate = hourlyRate;
    session.rawAmount = rawAmount;
    session.roundedAmount = roundedAmount;
    session.discount = discountAmount;
    session.discountReason = discountReason || '';
    session.finalAmount = finalAmount;

    // Determine who pays: if loserCustomerId provided (2-player match), loser pays.
    if (loserCustomerId) {
      session.loserCustomerId = loserCustomerId;
      const loser = await Player.findById(loserCustomerId).lean();
      if (loser) {
        session.payableCustomer = loser.fullName;
        session.payableCustomerId = loser._id;
        await Player.findByIdAndUpdate(loser._id, { $inc: { losses: 1 } });
      }
      const winnerId = session.secondaryCustomerId &&
        String(session.secondaryCustomerId) === String(loserCustomerId)
        ? session.customerId
        : session.secondaryCustomerId;
      if (winnerId) {
        await Player.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });
      }
    } else {
      session.payableCustomer = payableCustomer || session.customerNameSnapshot;
      session.payableCustomerId = session.customerId;
    }

    if (finalAmount <= 0) {
      session.paymentStatus = 'paid';
    }

    await session.save();
    await Court.findByIdAndUpdate(session.resourceId, { status: 'available' });

    const populatedSession = await BookingSession.findById(session._id)
      .populate('resourceId')
      .populate('customerId');

    return success(res, { data: populatedSession });
  } catch (err) {
    next(err);
  }
};

export const timerExpired = async (req, res, next) => {
  try {
    const session = await BookingSession.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'NOT_FOUND' });
    }
    if (session.bookingStatus !== 'in_progress') {
      return error(res, { statusCode: 400, message: 'Session is not active', code: 'NOT_ACTIVE' });
    }

    const now = new Date();
    const duration = session.bookedDuration > 0
      ? session.bookedDuration
      : calculateDurationMinutes(session.startTimeRounded, roundUpTo5Minutes(now));

    const hourlyRate = (session.pricingModeAtStart || session.pricingMode) === 'night'
      ? (session.rateSnapshot?.nightPrice || session.nightPrice)
      : (session.rateSnapshot?.dayPrice || session.dayPrice);
    const rawAmount = (duration / 60) * hourlyRate;
    const roundedAmount = roundToNearest5(rawAmount);

    session.endTime = now;
    session.endTimeRounded = roundUpTo5Minutes(now);
    session.durationMinutes = duration;
    session.bookingStatus = 'completed';
    session.pricingModeAtEnd = getPricingMode();
    session.hourlyRate = hourlyRate;
    session.rawAmount = rawAmount;
    session.roundedAmount = roundedAmount;
    session.finalAmount = roundedAmount;
    session.payableCustomer = session.customerNameSnapshot;
    session.payableCustomerId = session.customerId;

    await session.save();
    await Court.findByIdAndUpdate(session.resourceId, { status: 'available' });

    const populatedSession = await BookingSession.findById(session._id)
      .populate('resourceId')
      .populate('customerId');

    return success(res, { data: populatedSession });
  } catch (err) {
    next(err);
  }
};

export const cancelSession = async (req, res, next) => {
  try {
    const session = await BookingSession.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'NOT_FOUND' });
    }
    if (session.bookingStatus !== 'in_progress') {
      return error(res, { statusCode: 400, message: 'Session can only be cancelled while active', code: 'NOT_ACTIVE' });
    }
    session.bookingStatus = 'cancelled';
    session.endTime = new Date();
    await session.save();
    await Court.findByIdAndUpdate(session.resourceId, { status: 'available' });

    return success(res, { message: 'Session cancelled successfully' });
  } catch (err) {
    next(err);
  }
};

export const getSessionsByCustomer = async (req, res, next) => {
  try {
    const sessions = await BookingSession.find({
      tenantId: req.tenantId,
      customerId: req.params.customerId
    })
      .populate('resourceId')
      .sort({ startTime: -1 });
    return success(res, { data: sessions });
  } catch (err) {
    next(err);
  }
};
