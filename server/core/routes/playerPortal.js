// ============================================================
// PLAYER PORTAL ROUTES — Dashboard, Bookings, Payments, Dues
// ============================================================
// These routes require player authentication and provide
// a cross-tenant view of the player's data.

import express from 'express';
import mongoose from 'mongoose';
import { playerAuth, optionalPlayerAuth } from '../middleware/playerAuth.js';
import { error as errorResponse, success as successResponse } from '../utils/responseHelper.js';
import Player from '../models/Player.js';
import Tenant from '../models/Tenant.js';

const router = express.Router();

// Helper: Get all session models from all modules
const getSessionModels = () => {
  const modelNames = ['BookingSession', 'PickleballBookingSession', 'CricketFootballBookingSession', 'GamingZoneBookingSession'];
  return modelNames
    .map(name => {
      try { return mongoose.model(name); }
      catch { return null; }
    })
    .filter(Boolean);
};

// Helper: Get payment models from all modules
const getPaymentModels = () => {
  const modelNames = ['Payment', 'PickleballPayment', 'CricketFootballPayment', 'GamingZonePayment'];
  return modelNames
    .map(name => {
      try { return mongoose.model(name); }
      catch { return null; }
    })
    .filter(Boolean);
};

const getDueModels = () => {
  const modelNames = ['Due', 'PickleballDue', 'CricketFootballDue', 'GamingZoneDue'];
  return modelNames
    .map(name => {
      try { return mongoose.model(name); }
      catch { return null; }
    })
    .filter(Boolean);
};

// ============================================================
// GET /api/player/dashboard
// ============================================================

/**
 * @swagger
 * /api/player/dashboard:
 *   get:
 *     tags: [Player Portal]
 *     summary: Get player dashboard stats across all linked venues
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', playerAuth, async (req, res, next) => {
  try {
    const player = await Player.findById(req.playerId)
      .populate('linkedTenants.tenantId', 'businessName tenantCode businessTypeId');

    if (!player) {
      return errorResponse(res, { statusCode: 404, message: 'Player not found.', code: 'NOT_FOUND' });
    }

    // The player's _id is the customerId for sessions
    const playerId = player._id;

    // Gather stats across all venues where the player has sessions
    const sessionModels = getSessionModels();

    let totalBookings = 0;
    let activeSessions = 0;
    let totalDue = 0;
    let totalPaid = 0;
    let recentSessions = [];

    // Aggregate across all session models
    for (const SessionModel of sessionModels) {
      const [countResult, activeResult, sessions] = await Promise.all([
        SessionModel.countDocuments({
          $or: [{ customerId: playerId }, { secondaryCustomerId: playerId }]
        }),
        SessionModel.countDocuments({
          $or: [{ customerId: playerId }, { secondaryCustomerId: playerId }],
          bookingStatus: 'in_progress'
        }),
        SessionModel.find({
          $or: [{ customerId: playerId }, { secondaryCustomerId: playerId }]
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('resourceId', 'name')
          .populate('tenantId', 'businessName')
          .lean()
          .catch(() => [])
      ]);
      totalBookings += countResult || 0;
      activeSessions += activeResult || 0;
      recentSessions = [...recentSessions, ...(sessions || [])];
    }

    // Get total due (across all Due models)
    const allDueModels = getDueModels();
    for (const DueModel of allDueModels) {
      const dueResult = await DueModel.aggregate([
        { $match: { customerId: playerId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } }
      ]).catch(() => []);
      totalDue += dueResult[0]?.total || 0;
    }

    // Get total paid (across all payment models)
    const allPaymentModels = getPaymentModels();
    for (const PayModel of allPaymentModels) {
      const paidResult = await PayModel.aggregate([
        { $match: { customerId: playerId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => []);
      totalPaid += paidResult[0]?.total || 0;
    }

    // Also account for totalDue stored on the player doc
    if (player.totalDue > 0) {
      totalDue = Math.max(totalDue, player.totalDue);
    }
    totalBookings = Math.max(totalBookings, player.totalBookings || 0);

    // Sort recent sessions by createdAt
    recentSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    recentSessions = recentSessions.slice(0, 10);

    return successResponse(res, {
      data: {
        stats: {
          totalBookings,
          activeSessions,
          totalDue: Math.round(totalDue * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          linkedVenues: player.linkedTenants.length
        },
        venues: player.linkedTenants.map(lt => ({
          tenantId: lt.tenantId?._id || lt.tenantId,
          businessName: lt.tenantId?.businessName || 'Venue',
          linkedAt: lt.linkedAt
        })),
        recentSessions
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/player/bookings
// ============================================================

/**
 * @swagger
 * /api/player/bookings:
 *   get:
 *     tags: [Player Portal]
 *     summary: Get player's bookings across all venues
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by booking status
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Player bookings list
 */
router.get('/bookings', playerAuth, async (req, res, next) => {
  try {
    const player = await Player.findById(req.playerId);
    if (!player) {
      return errorResponse(res, { statusCode: 404, message: 'Player not found.', code: 'NOT_FOUND' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;

    const sessionModels = getSessionModels();
    let allBookings = [];
    let totalCount = 0;

    for (const SessionModel of sessionModels) {
      const filter = {
        $or: [{ customerId: player._id }, { secondaryCustomerId: player._id }]
      };
      if (statusFilter) {
        filter.bookingStatus = statusFilter;
      }

      const [bookings, count] = await Promise.all([
        SessionModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('resourceId', 'name')
          .populate('customerId', 'fullName phone')
          .populate('tenantId', 'businessName')
          .lean()
          .catch(() => []),
        SessionModel.countDocuments(filter).catch(() => 0)
      ]);

      allBookings = [...allBookings, ...(bookings || [])];
      totalCount += count || 0;
    }

    // Sort combined results
    allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    allBookings = allBookings.slice(0, limit);

    return successResponse(res, {
      data: allBookings,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/player/payments
// ============================================================

/**
 * @swagger
 * /api/player/payments:
 *   get:
 *     tags: [Player Portal]
 *     summary: Get player's payment history across all venues
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Player payments list
 */
router.get('/payments', playerAuth, async (req, res, next) => {
  try {
    const player = await Player.findById(req.playerId);
    if (!player) {
      return errorResponse(res, { statusCode: 404, message: 'Player not found.', code: 'NOT_FOUND' });
    }

    const allPaymentModels = getPaymentModels();

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;

    let allPayments = [];
    let totalCount = 0;

    for (const PayModel of allPaymentModels) {
      const [payments, count] = await Promise.all([
        PayModel.find({ customerId: player._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('customerId', 'fullName phone')
          .populate('tenantId', 'businessName')
          .populate('bookingSessionId', 'resourceNameSnapshot')
          .lean()
          .catch(() => []),
        PayModel.countDocuments({ customerId: player._id }).catch(() => 0)
      ]);
      allPayments = [...allPayments, ...(payments || [])];
      totalCount += count || 0;
    }

    // Sort combined results by createdAt (most recent first)
    allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return successResponse(res, {
      data: allPayments,
      meta: { total: totalCount, page, limit }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/player/dues
// ============================================================

/**
 * @swagger
 * /api/player/dues:
 *   get:
 *     tags: [Player Portal]
 *     summary: Get player's outstanding dues across all venues
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Player dues list
 */
router.get('/dues', playerAuth, async (req, res, next) => {
  try {
    const player = await Player.findById(req.playerId);
    if (!player) {
      return errorResponse(res, { statusCode: 404, message: 'Player not found.', code: 'NOT_FOUND' });
    }

    const allDueModels = getDueModels();
    if (allDueModels.length === 0) {
      return successResponse(res, { data: [] });
    }

    // Build status filter
    let statusFilter = {};
    if (req.query.status === 'active') {
      statusFilter = { status: { $in: ['pending', 'partial'] } };
    } else if (req.query.status === 'paid') {
      statusFilter = { status: 'paid' };
    } else if (req.query.status === 'waived') {
      statusFilter = { status: 'waived' };
    } else if (req.query.status && req.query.status !== 'all') {
      statusFilter = { status: req.query.status };
    }

    let allDues = [];
    for (const DueModel of allDueModels) {
      const dues = await DueModel.find({
        customerId: player._id,
        ...statusFilter
      })
        .sort({ createdAt: -1 })
        .populate('customerId', 'fullName phone')
        .populate('tenantId', 'businessName')
        .lean()
        .catch(() => []);
      allDues = [...allDues, ...(dues || [])];
    }

    // Sort combined results
    allDues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return successResponse(res, { data: allDues });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/player/venues — List active venues
// ============================================================

/**
 * @swagger
 * /api/player/venues:
 *   get:
 *     tags: [Player Portal]
 *     summary: List active venues for player browsing
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search venues by name
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: Filter by city
 *     responses:
 *       200:
 *         description: List of active venues
 */
router.get('/venues', optionalPlayerAuth, async (req, res, next) => {
  try {
    const filter = {
      portalStatus: 'active',
      isActive: true
    };

    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { businessName: searchRegex },
        { ownerName: searchRegex },
        { 'address.city': searchRegex }
      ];
    }

    if (req.query.city) {
      filter['address.city'] = { $regex: req.query.city, $options: 'i' };
    }

    const venues = await Tenant.find(filter)
      .populate('businessTypeId', 'key name')
      .select('businessName tenantCode businessTypeId address.city address.state timezone currency maxResources')
      .sort({ businessName: 1 })
      .limit(100)
      .lean();

    // Resource model mapping per business type
    // (same mapping used by the /venues/:tenantId/resources endpoint)
    const modelMap = {
      'pool_snooker': 'VenueResource',
      'pickleball': 'Court',
      'cricket_football': 'Turf',
      'gaming_zone': 'GamingResource'
    };

    const venuesWithInfo = await Promise.all(venues.map(async (venue) => {
      const businessType = venue.businessTypeId?.key || 'unknown';
      const modelName = modelMap[businessType];
      let totalResources = 0;
      let availableResources = 0;

      if (modelName) {
        try {
          const ResourceModel = mongoose.model(modelName);
          const [total, available] = await Promise.all([
            ResourceModel.countDocuments({ tenantId: venue._id }).catch(() => 0),
            ResourceModel.countDocuments({ tenantId: venue._id, status: 'available' }).catch(() => 0)
          ]);
          totalResources = total || 0;
          availableResources = available || 0;
        } catch {
          // Model not registered — skip
        }
      }

      return {
        _id: venue._id,
        businessName: venue.businessName,
        tenantCode: venue.tenantCode,
        businessType,
        businessTypeName: venue.businessTypeId?.name || 'Unknown',
        city: venue.address?.city || null,
        state: venue.address?.state || null,
        timezone: venue.timezone,
        currency: venue.currency,
        totalResources,
        availableResources
      };
    }));

    return successResponse(res, { data: venuesWithInfo });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/player/venues/:tenantId/resources — List resources with availability + session timing
// ============================================================

const sessionModelMap = {
  'pool_snooker': 'BookingSession',
  'pickleball': 'PickleballBookingSession',
  'cricket_football': 'CricketFootballBookingSession',
  'gaming_zone': 'GamingZoneBookingSession'
};

/**
 * @swagger
 * /api/player/venues/{tenantId}/resources:
 *   get:
 *     tags: [Player Portal]
 *     summary: Get resources with availability for a specific venue
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by resource status (available, occupied, etc.)
 *     responses:
 *       200:
 *         description: Resources list
 */
router.get('/venues/:tenantId/resources', optionalPlayerAuth, async (req, res, next) => {
  try {
    const { tenantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid venue ID.',
        code: 'INVALID_ID'
      });
    }

    // Verify the venue exists and is active
    const venue = await Tenant.findById(tenantId)
      .populate('businessTypeId', 'key name')
      .select('businessName tenantCode businessTypeId isActive portalStatus address city state timezone currency')
      .lean();

    if (!venue || !venue.isActive || venue.portalStatus !== 'active') {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Venue not found or not active.',
        code: 'NOT_FOUND'
      });
    }

    // Determine which resource model to use based on business type
    const businessType = venue.businessTypeId?.key;
    const modelMap = {
      'pool_snooker': 'VenueResource',
      'pickleball': 'Court',
      'cricket_football': 'Turf',
      'gaming_zone': 'GamingResource'
    };

    const modelName = modelMap[businessType];
    if (!modelName) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Unknown business type: ${businessType}`,
        code: 'UNKNOWN_TYPE'
      });
    }

    const ResourceModel = mongoose.model(modelName);

    const filter = { tenantId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const resources = await ResourceModel.find(filter)
      .select('name category code status dayPrice nightPrice capacity notes')
      .sort({ name: 1 })
      .lean();

    // ============================================================
    // Enrich occupied resources with active session timing info
    // ============================================================
    const occupiedResources = resources.filter(r => r.status === 'occupied');
    let activeSessionsMap = {};

    if (occupiedResources.length > 0) {
      const sessionModelName = sessionModelMap[businessType];
      if (sessionModelName) {
        try {
          const SessionModel = mongoose.model(sessionModelName);
          const resourceIds = occupiedResources.map(r => r._id);
          const activeSessions = await SessionModel.find({
            tenantId,
            bookingStatus: 'in_progress',
            resourceId: { $in: resourceIds }
          })
            .select('startTime startTimeRounded endTime bookedDuration resourceId customerNameSnapshot')
            .lean();

          activeSessions.forEach(session => {
            activeSessionsMap[session.resourceId.toString()] = {
              startTime: session.startTime,
              startTimeRounded: session.startTimeRounded || null,
              endTime: session.endTime || null,
              bookedDuration: session.bookedDuration || 0,
              customerName: session.customerNameSnapshot
            };
          });
        } catch (e) {
          console.warn(`[PlayerPortal] Could not load active sessions for ${sessionModelName}:`, e.message);
        }
      }
    }

    // Attach activeSession info to each resource
    const enrichedResources = resources.map(resource => ({
      ...resource,
      activeSession: activeSessionsMap[resource._id.toString()] || null
    }));

    return successResponse(res, {
      data: {
        venue: {
          _id: venue._id,
          businessName: venue.businessName,
          tenantCode: venue.tenantCode,
          businessType,
          businessTypeName: venue.businessTypeId?.name,
          address: venue.address,
          timezone: venue.timezone,
          currency: venue.currency
        },
        resources: enrichedResources
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/player/link-venue
// ============================================================
// Links a player to a venue's customer record.
// Called when a venue owner/staff links a player account.

/**
 * @swagger
 * /api/player/link-venue:
 *   post:
 *     tags: [Player Portal]
 *     summary: Link player to a venue customer record
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId: { type: string }
 *               customerId: { type: string }
 *     responses:
 *       200:
 *         description: Venue linked successfully
 */
router.post('/link-venue', playerAuth, async (req, res, next) => {
  try {
    const { tenantId, customerId } = req.body;

    if (!tenantId || !customerId) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'tenantId and customerId are required.',
        code: 'MISSING_FIELDS'
      });
    }

    // Look up the player (the customerId IS the player's _id in the unified system)
    const player = await Player.findById(customerId);
    if (!player) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Player not found for this venue.',
        code: 'NOT_FOUND'
      });
    }

    // Check if already linked
    const alreadyLinked = player.linkedTenants.some(
      lt => lt.tenantId.toString() === tenantId
    );

    if (!alreadyLinked) {
      player.linkedTenants.push({
        tenantId,
        linkedAt: new Date()
      });
      await player.save();
    }

    return successResponse(res, {
      message: alreadyLinked ? 'Already linked to this venue.' : 'Venue linked successfully!',
      data: { linkedTenants: player.linkedTenants }
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
