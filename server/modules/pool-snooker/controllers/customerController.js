import mongoose from 'mongoose';
import Player from '../../../core/models/Player.js';
import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';
import { generateCustomerCode } from '../services/pricingService.js';
import { hashPassword, generateTemporaryPassword } from '../../../core/utils/passwordHelper.js';

const checkAndIncrementCode = async (tenantId, baseCode) => {
  let counter = 1;
  let finalCode = baseCode;

  while (true) {
    const existing = await Player.findOne({ customerCode: finalCode });
    if (!existing) break;
    counter++;
    const parts = baseCode.split('-');
    finalCode = `${parts[0]}-${parts[1]}${counter}`;
  }

  return finalCode;
};

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

    // Attach pending due amounts scoped to the requesting tenant
    // Note: aggregation pipelines don't auto-cast ObjectIds like find() does,
    // so we must cast to ObjectId explicitly for the $match to work.
    const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);

    const playersWithDues = await Promise.all(players.map(async (player) => {
      const pendingDues = await DueModel.aggregate([
        { $match: { tenantId: tenantObjectId, customerId: player._id, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } }
      ]);
      return {
        ...player,
        source: player.tenantId ? 'venue' : 'portal',
        // Only show dues scoped to the requesting tenant, not the global player.totalDue
        // which accumulates across ALL venues this player has visited
        totalDue: pendingDues[0]?.total ?? 0
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
 * /api/tenant/customers:
 *   post:
 *     tags: [Customers]
 *     summary: Create customer
 */
export const createCustomer = async (req, res, next) => {
  try {
    const { fullName, nickname, phone, email, dob, tags } = req.body;

    if (!fullName) {
      return error(res, { statusCode: 400, message: 'Full name is required', code: 'MISSING_FIELDS' });
    }

    // Email is required so we can send the player their login credentials
    if (!email) {
      return error(res, { statusCode: 400, message: 'Email is required — player needs it to login to their portal', code: 'MISSING_FIELDS' });
    }

    let customerCode = generateCustomerCode(fullName);
    customerCode = await checkAndIncrementCode(req.tenantId, customerCode);

    // Generate a secure temporary password
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    const player = await Player.create({
      tenantId: req.tenantId,
      customerCode,
      fullName,
      nickname,
      phone: phone || undefined,
      email,
      dob: dob ? new Date(dob) : null,
      tags: tags || [],
      passwordHash,
      // Force password change on first login
      passwordChangeRequired: true
    });

    // Return the temp password so the owner can share it with the player
    return created(res, {
      data: {
        player: {
          _id: player._id,
          fullName: player.fullName,
          email: player.email,
          phone: player.phone,
          customerCode: player.customerCode
        },
        tempPassword,
        message: `Player created. Share this temporary password with ${player.fullName}: ${tempPassword}`
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return error(res, { statusCode: 400, message: 'Customer with this ID already exists', code: 'DUPLICATE' });
    }
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
 * /api/tenant/customers/:id:
 *   delete:
 *     tags: [Customers]
 *     summary: Delete customer
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);
    if (!player) {
      return error(res, { statusCode: 404, message: 'Customer not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Customer deleted successfully' });
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
    const { amount, mode } = req.body;
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

    const totalRemaining = pendingDues.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    const payAmount = amount ? Math.min(parseFloat(amount), totalRemaining) : totalRemaining;

    if (payAmount <= 0) {
      return error(res, { statusCode: 400, message: 'Invalid payment amount', code: 'INVALID_AMOUNT' });
    }

    let remainingToPay = payAmount;
    const updatedDues = [];

    for (const due of pendingDues) {
      if (remainingToPay <= 0) break;

      const dueRemaining = due.amount - due.paidAmount;
      const payForThisDue = Math.min(remainingToPay, dueRemaining);

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

      // Update due
      due.paidAmount += payForThisDue;
      due.partialPayments.push({ amount: payForThisDue, mode: mode || 'cash', paidAt: new Date() });

      const remainingAfter = due.amount - due.paidAmount;
      if (remainingAfter <= 0) {
        due.status = 'paid';
        due.paidAt = new Date();
        due.paymentMode = mode || 'cash';
      } else if (due.paidAmount > 0) {
        due.status = 'partial';
      }

      await due.save();

      // Update session payment status
      const session = await BookingSessionModel.findById(due.bookingSessionId);
      if (session && (session.paymentStatus === 'due' || session.paymentStatus === 'pending')) {
        const allDuesForSession = await DueModel.find({ bookingSessionId: due.bookingSessionId });
        const allPaid = allDuesForSession.every(d => d.status === 'paid' || d.status === 'waived');
        session.paymentStatus = allPaid ? 'paid' : 'partial';
        await session.save();
      }

      remainingToPay -= payForThisDue;
      updatedDues.push(due);
    }

    // Update player totalDue
    player.totalDue = Math.max(0, (player.totalDue || 0) - payAmount);
    await player.save();

    return success(res, {
      data: {
        customer: player,
        dues: updatedDues,
        totalPaid: payAmount,
        remainingDue: Math.max(0, totalRemaining - payAmount)
      },
      message: `₹${payAmount} paid successfully`
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
