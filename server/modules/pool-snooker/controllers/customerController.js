import mongoose from 'mongoose';
import Player from '../../../core/models/Player.js';
import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import { success, error } from '../../../core/utils/responseHelper.js';

// Round to 2 decimal places — prevents floating point artifacts like 0.9900000000000002
const r2 = (val) => Math.round((val || 0) * 100) / 100;

/**
 * @swagger
 * /api/tenant/customers:
 *   get:
 *     tags: [Customers]
 *     summary: List all customers
 */
export const getAllCustomers = async (req, res, next) => {
  try {
    // Return ALL players across all venues (shared pool)
    const players = await Player.find({})
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires -passwordChangeRequired')
      .sort({ createdAt: -1 })
      .lean();

    const DueModel = getBusinessModel(req, 'Due');
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');

    // Note: aggregation pipelines don't auto-cast ObjectIds like find() does,
    // so we must cast to ObjectId explicitly for the $match to work.
    const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);

    // Calculate tenant-scoped wins/losses from BookingSession data
    // instead of using the global wins/losses on the Player document
    const [lossCounts, winCounts] = await Promise.all([
      BookingSessionModel.aggregate([
        { $match: {
          tenantId: tenantObjectId,
          bookingStatus: 'completed',
          loserCustomerId: { $exists: true, $ne: null }
        }},
        { $group: { _id: '$loserCustomerId', count: { $sum: 1 } } }
      ]),
      BookingSessionModel.aggregate([
        { $match: {
          tenantId: tenantObjectId,
          bookingStatus: 'completed',
          loserCustomerId: { $exists: true, $ne: null }
        }},
        { $project: {
          winnerId: {
            $cond: [
              { $eq: ['$customerId', '$loserCustomerId'] },
              '$secondaryCustomerId',
              '$customerId'
            ]
          }
        }},
        // Filter out null winners (e.g. single-player session with loser set incorrectly)
        { $match: { winnerId: { $ne: null, $exists: true } } },
        { $group: { _id: '$winnerId', count: { $sum: 1 } } }
      ])
    ]);

    // Build lookup maps for O(1) access
    const winMap = {};
    winCounts.forEach(w => { winMap[w._id.toString()] = w.count; });
    const lossMap = {};
    lossCounts.forEach(l => { lossMap[l._id.toString()] = l.count; });

    // Attach pending due amounts scoped to the requesting tenant
    const playersWithDues = await Promise.all(players.map(async (player) => {
      const pendingDues = await DueModel.aggregate([
        { $match: { tenantId: tenantObjectId, customerId: player._id, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: { $round: [{ $subtract: ['$amount', '$paidAmount'] }, 2] } } } }
      ]);
      return {
        ...player,
        source: player.tenantId ? 'venue' : 'portal',
        // Only show dues scoped to the requesting tenant, not the global player.totalDue
        // which accumulates across ALL venues this player has visited
        totalDue: Math.round((pendingDues[0]?.total ?? 0) * 100) / 100,
        // Override global wins/losses with tenant-scoped values calculated
        // from completed 2-player sessions at this venue
        wins: winMap[player._id.toString()] || 0,
        losses: lossMap[player._id.toString()] || 0
      };
    }));

    return success(res, { data: playersWithDues });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/customers/search:
 *   get:
 *     tags: [Customers]
 *     summary: Search customers
 */
export const searchCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) {
      return success(res, { data: [] });
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeQ = escapeRegex(q);

    // Search ALL players across all venues (shared pool)
    const searchFilter = {
      $and: [
        {
          $or: [
            { fullName: { $regex: safeQ, $options: 'i' } },
            { nickname: { $regex: safeQ, $options: 'i' } },
            { customerCode: { $regex: safeQ, $options: 'i' } },
            { email: { $regex: safeQ, $options: 'i' } },
            { phone: { $regex: safeQ, $options: 'i' } }
          ]
        }
      ]
    };

    const players = await Player.find(searchFilter)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires -passwordChangeRequired')
      .limit(15)
      .lean();

    const data = players.map(p => ({
      ...p,
      source: p.tenantId ? 'venue' : 'portal',
      tenantId: p.tenantId || null
    }));

    return success(res, { data });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/customers/:id:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer by ID
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires -passwordChangeRequired');
    if (!player) {
      return error(res, { statusCode: 404, message: 'Customer not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: player });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/customers/:id:
 *   put:
 *     tags: [Customers]
 *     summary: Update customer
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return error(res, { statusCode: 404, message: 'Customer not found', code: 'NOT_FOUND' });
    }

    const { fullName, nickname, phone, email, dob, tags } = req.body;
    if (fullName) player.fullName = fullName;
    if (nickname !== undefined) player.nickname = nickname;
    if (phone !== undefined) player.phone = phone;
    if (email !== undefined) player.email = email;
    if (dob !== undefined) player.dob = dob ? new Date(dob) : null;
    if (tags !== undefined) player.tags = tags;

    await player.save();
    return success(res, { data: player });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/customers/:id/bookings:
 *   get:
 *     tags: [Customers]
 *     summary: Get customer booking history
 */
export const getCustomerBookings = async (req, res, next) => {
  try {
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const sessions = await BookingSessionModel.find({
      tenantId: req.tenantId,
      customerId: req.params.id
    })
      .populate('resourceId', 'name category')
      .sort({ startTime: -1 });

    return success(res, { data: sessions });
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

    const DueModel = getBusinessModel(req, 'Due');
    const PaymentModel = getBusinessModel(req, 'Payment');
    const BookingSessionModel = getBusinessModel(req, 'BookingSession');

    // Get all pending/partial dues for this customer, oldest first
    const pendingDues = await DueModel.find({
      tenantId: req.tenantId,
      customerId: player._id,
      status: { $in: ['pending', 'partial'] }
    }).sort({ createdAt: 1 });

    if (pendingDues.length === 0) {
      return error(res, { statusCode: 400, message: 'No pending dues for this customer', code: 'NO_DUES' });
    }

    const totalRemaining = r2(pendingDues.reduce((sum, d) => sum + r2(d.amount - d.paidAmount), 0));

    // Apply discount if provided (₹ amount to deduct from total).
    // Discount is only allowed when paying the FULL remaining amount.
    let discountAmount = 0;
    if (discount) {
      const parsedDiscount = Math.max(0, parseFloat(discount));
      const parsedAmount = amount ? parseFloat(amount) : totalRemaining;
      if (parsedAmount < totalRemaining) {
        return error(res, { statusCode: 400, message: 'Discount can only be applied when clearing the full due amount. Enter the full amount or remove the discount.', code: 'DISCOUNT_PARTIAL_NOT_ALLOWED' });
      }
      discountAmount = r2(Math.min(parsedDiscount, totalRemaining));
    }
    const discountedTotal = r2(totalRemaining - discountAmount);
    const payAmount = amount ? r2(Math.min(Math.max(0, parseFloat(amount)), discountedTotal)) : discountedTotal;

    if (payAmount <= 0 && discountAmount <= 0) {
      return error(res, { statusCode: 400, message: 'Invalid payment amount', code: 'INVALID_AMOUNT' });
    }

    // Distribute the discount proportionally across dues
    let remainingDiscount = discountAmount;
    let remainingToPay = payAmount;
    const updatedDues = [];

    for (const due of pendingDues) {
      if (remainingToPay <= 0 && remainingDiscount <= 0) break;

      const dueRemaining = r2(due.amount - due.paidAmount);

      // Apply proportional discount to this due
      let discountForThisDue = 0;
      if (remainingDiscount > 0 && totalRemaining > 0) {
        const proportion = dueRemaining / totalRemaining;
        if (remainingDiscount > 0 && proportion > 0) {
          // Each due gets a fair share of the remaining discount proportional to its size.
          // Formula: remainingDiscount * (dueRemaining / totalRemaining)
          // Old bug: was dueRemaining * proportion which squared dueRemaining!
          discountForThisDue = r2(Math.min(remainingDiscount * proportion, dueRemaining));
          // Edge case: rounding can leave 1-2 paise undistributed; assign to last due
          if (remainingDiscount > 0 && discountForThisDue <= 0) {
            discountForThisDue = r2(Math.min(remainingDiscount, dueRemaining));
          }
          remainingDiscount = r2(remainingDiscount - discountForThisDue);
        }
      }

      // The payable amount for this due after discount
      const effectiveDueRemaining = r2(dueRemaining - discountForThisDue);
      const payForThisDue = r2(Math.min(remainingToPay, effectiveDueRemaining));

      if (payForThisDue > 0) {
        // Create payment record
        await PaymentModel.create({
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

        due.paidAmount = r2(due.paidAmount + payForThisDue);
        due.partialPayments.push({ amount: payForThisDue, mode: mode || 'cash', paidAt: new Date() });
      }

      // If discount + paid amount covers the full due, mark as paid.
      // discountForThisDue is waived, not added to paidAmount, so we must account for it.
      const totalCovered = r2(r2(due.amount - due.paidAmount) - discountForThisDue);
      if (totalCovered <= 0) {
        due.status = 'paid';
        due.paidAt = new Date();
        due.paymentMode = mode || 'cash';
      } else if (due.paidAmount > 0) {
        due.status = 'partial';
      }

      await due.save();

      // Update session payment status (also handle 'partial' since discounts
      // can fully clear a session that previously had partial payment)
      const session = await BookingSessionModel.findById(due.bookingSessionId);
      if (session && ['pending', 'due', 'partial'].includes(session.paymentStatus)) {
        const allDuesForSession = await DueModel.find({ bookingSessionId: due.bookingSessionId });
        const allPaid = allDuesForSession.every(d => d.status === 'paid' || d.status === 'waived');
        session.paymentStatus = allPaid ? 'paid' : 'partial';
        await session.save();
      }

      remainingToPay = r2(remainingToPay - payForThisDue);
      updatedDues.push(due);
    }

    // Update player totalDue
    const totalPaidOrDiscounted = r2(payAmount + discountAmount);
    player.totalDue = r2(Math.max(0, (player.totalDue || 0) - totalPaidOrDiscounted));
    await player.save();

    return success(res, {
      data: {
        customer: player,
        dues: updatedDues,
        totalPaid: payAmount,
        discountApplied: discountAmount,
        remainingDue: r2(Math.max(0, totalRemaining - payAmount - discountAmount))
      },
      message: discountAmount > 0
        ? `₹${payAmount} paid (₹${discountAmount} discount applied) successfully`
        : `₹${payAmount} paid successfully`
    });
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
    const DueModel = getBusinessModel(req, 'Due');
    const dues = await DueModel.find({
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
