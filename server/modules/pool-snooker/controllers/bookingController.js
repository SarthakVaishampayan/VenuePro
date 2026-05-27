import BookingSession from '../models/BookingSession.js';
import VenueResource from '../models/VenueResource.js';
import Player from '../../../core/models/Player.js';
import TenantSetting from '../models/TenantSetting.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';
import eventBus from '../../../core/events/eventBus.js';
import { EVENT_TYPES } from '../../../core/events/eventTypes.js';
import {
  getPricingMode,
  calculateSessionAmount,
  formatDuration
} from '../services/pricingService.js';

/**
 * Fetch the night start hour setting for a tenant, defaulting to 18 (6 PM).
 */
const getNightStartHour = async (tenantId) => {
  try {
    const setting = await TenantSetting.findOne({ tenantId, key: 'nightStartHour' }).lean();
    return setting ? parseInt(setting.value, 10) : 18;
  } catch {
    return 18;
  }
};

/**
 * @swagger
 * /api/tenant/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: List all sessions
 */
export const getAllSessions = async (req, res, next) => {
  try {
    const { status, limit, page = 1 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (status) filter.bookingStatus = status;

    const limitNum = parseInt(limit) || 50;
    const skip = (parseInt(page) - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      BookingSession.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('resourceId', 'name category')
        .populate('customerId', 'fullName phone')
        .lean(),
      BookingSession.countDocuments(filter)
    ]);

    return success(res, {
      data: sessions,
      meta: { total, page: parseInt(page), limit: limitNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/bookings/active:
 *   get:
 *     tags: [Bookings]
 *     summary: Get active sessions
 */
export const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await BookingSession.find({
      tenantId: req.tenantId,
      bookingStatus: 'in_progress'
    })
      .sort({ startTime: -1 })
      .populate('resourceId', 'name category')
      .populate('customerId', 'fullName phone')
      .lean();

    return success(res, { data: sessions });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/bookings/:id:
 *   get:
 *     tags: [Bookings]
 *     summary: Get session by ID
 */
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

/**
 * @swagger
 * /api/tenant/bookings/start:
 *   post:
 *     tags: [Bookings]
 *     summary: Start a new session
 */
export const startSession = async (req, res, next) => {
  try {
    const { resourceId, customerId, customerName, customerUniqueId, secondaryCustomerId, secondaryCustomerName, secondaryCustomerUniqueId } = req.body;

    if (!resourceId || !customerId) {
      return error(res, { statusCode: 400, message: 'Resource and customer are required', code: 'MISSING_FIELDS' });
    }

    // Find the resource
    const resource = await VenueResource.findOne({ _id: resourceId, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
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

    if (resource.status === 'occupied') {
      return error(res, { statusCode: 400, message: 'Resource is already occupied', code: 'ALREADY_OCCUPIED' });
    }

    const now = new Date();
    const nightStartHour = await getNightStartHour(req.tenantId);
    const pricingMode = getPricingMode(nightStartHour);
    const { startTimeRounded } = calculateSessionAmount(now, now, resource.dayPrice, resource.nightPrice, pricingMode);

    const session = await BookingSession.create({
      tenantId: req.tenantId,
      resourceId: resource._id,
      resourceNameSnapshot: resource.name,
      customerId: player._id,
      customerNameSnapshot: player.fullName,
      customerUniqueId: customerUniqueId || player.customerCode,
      secondaryCustomerId: secondaryCustomerId || null,
      secondaryCustomerNameSnapshot: secondaryCustomerName || null,
      secondaryCustomerUniqueId: secondaryCustomerUniqueId || null,
      startTime: now,
      startTimeRounded,
      bookingStatus: 'in_progress',
      pricingModeAtStart: pricingMode,
      rateSnapshot: { dayPrice: resource.dayPrice, nightPrice: resource.nightPrice },
      payableCustomerId: null,
      payableCustomer: null,
      createdByUserId: req.user.id,
      createdByRole: req.user.role
    });

    resource.status = 'occupied';
    await resource.save();

    // Increment booking count
    player.totalBookings = (player.totalBookings || 0) + 1;
    await player.save();

    if (secondaryCustomerId) {
      await Player.findByIdAndUpdate(secondaryCustomerId, { $inc: { totalBookings: 1 } });
    }

    const populatedSession = await BookingSession.findById(session._id)
      .populate('resourceId', 'name category dayPrice nightPrice')
      .populate('customerId', 'fullName phone');

    // Emit session started event
    eventBus.emit(EVENT_TYPES.SESSION_STARTED, {
      tenantId: req.tenantId,
      ownerUserId: req.user.id,
      sessionId: session._id,
      resourceName: resource?.name || 'Unknown',
      customerName: player?.fullName || 'Unknown'
    });

    return created(res, { data: populatedSession });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/bookings/:id/end:
 *   post:
 *     tags: [Bookings]
 *     summary: End a session
 */
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
    const nightStartHour = await getNightStartHour(req.tenantId);
    const currentPricingMode = getPricingMode(nightStartHour);

    const calc = calculateSessionAmount(
      session.startTimeRounded,
      now,
      session.rateSnapshot.dayPrice,
      session.rateSnapshot.nightPrice,
      session.pricingModeAtStart,
      discount || 0
    );

    session.endTime = now;
    session.endTimeRounded = calc.endTimeRounded;
    session.durationMinutes = calc.durationMinutes;
    session.bookingStatus = 'completed';
    session.pricingModeAtEnd = currentPricingMode;
    session.rawAmount = calc.rawAmount;
    session.roundedAmount = calc.roundedAmount;
    session.discount = calc.discountAmount;
    session.discountReason = discountReason || '';
    session.finalAmount = calc.finalAmount;
    // Determine who pays: if loserCustomerId is provided (2-player match), the loser pays.
    // If single player, the primary customer pays.
    if (loserCustomerId) {
      session.loserCustomerId = loserCustomerId;
      // Look up the loser to get their name
      const loser = await Player.findById(loserCustomerId).lean();
      if (loser) {
        session.payableCustomer = loser.fullName;
        session.payableCustomerId = loser._id;
        // Increment loser's losses
        await Player.findByIdAndUpdate(loser._id, { $inc: { losses: 1 } });
      }
      // Increment winner's wins (the other player in a 2-player match)
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

    if (calc.finalAmount <= 0) {
      session.paymentStatus = 'paid';
    }

    await session.save();
    await VenueResource.findByIdAndUpdate(session.resourceId, { status: 'available' });

    const populatedSession = await BookingSession.findById(session._id)
      .populate('resourceId', 'name category')
      .populate('customerId', 'fullName phone')
      .populate('loserCustomerId', 'fullName');

    // Emit session ended event
    eventBus.emit(EVENT_TYPES.SESSION_ENDED, {
      tenantId: req.tenantId,
      ownerUserId: req.user.id,
      sessionId: session._id,
      resourceName: session.resourceNameSnapshot || 'Unknown',
      amount: calc?.finalAmount || 0
    });

    return success(res, { data: populatedSession });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/bookings/:id/timer-expired:
 *   put:
 *     tags: [Bookings]
 *     summary: Auto-complete session when timer expires
 */
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
    const nightStartHour = await getNightStartHour(req.tenantId);
    const currentPricingMode = getPricingMode(nightStartHour);

    const calc = calculateSessionAmount(
      session.startTimeRounded,
      now,
      session.rateSnapshot.dayPrice,
      session.rateSnapshot.nightPrice,
      session.pricingModeAtStart,
      0
    );

    session.endTime = now;
    session.endTimeRounded = calc.endTimeRounded;
    session.durationMinutes = calc.durationMinutes;
    session.bookingStatus = 'completed';
    session.pricingModeAtEnd = currentPricingMode;
    session.rawAmount = calc.rawAmount;
    session.roundedAmount = calc.roundedAmount;
    session.finalAmount = calc.finalAmount;
    session.payableCustomer = session.customerNameSnapshot;
    session.payableCustomerId = session.customerId;

    if (calc.finalAmount <= 0) {
      session.paymentStatus = 'paid';
    }

    await session.save();
    await VenueResource.findByIdAndUpdate(session.resourceId, { status: 'available' });

    const populatedSession = await BookingSession.findById(session._id)
      .populate('resourceId', 'name category')
      .populate('customerId', 'fullName phone');

    return success(res, { data: populatedSession });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/bookings/:id/cancel:
 *   post:
 *     tags: [Bookings]
 *     summary: Cancel a session
 */
export const cancelSession = async (req, res, next) => {
  try {
    const session = await BookingSession.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!session) {
      return error(res, { statusCode: 404, message: 'Session not found', code: 'NOT_FOUND' });
    }

    if (session.bookingStatus !== 'in_progress') {
      return error(res, { statusCode: 400, message: 'Session is not active', code: 'NOT_ACTIVE' });
    }

    session.bookingStatus = 'cancelled';
    await session.save();
    await VenueResource.findByIdAndUpdate(session.resourceId, { status: 'available' });

    return success(res, { message: 'Session cancelled successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/bookings/customer/:customerId:
 *   get:
 *     tags: [Bookings]
 *     summary: Get sessions by customer
 */
export const getSessionsByCustomer = async (req, res, next) => {
  try {
    const sessions = await BookingSession.find({
      tenantId: req.tenantId,
      customerId: req.params.customerId
    })
      .populate('resourceId', 'name category')
      .sort({ startTime: -1 });

    return success(res, { data: sessions });
  } catch (err) {
    next(err);
  }
};
