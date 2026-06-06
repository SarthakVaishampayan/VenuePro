import { getBusinessModel } from '../../../core/services/moduleRegistry.js';
import Tenant from '../../../core/models/Tenant.js';
import Branch from '../models/Branch.js';
import VenueResource from '../models/VenueResource.js';
import StaffUser from '../models/StaffUser.js';
import StaffShift from '../models/StaffShift.js';
import Expense from '../models/Expense.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

/**
 * @swagger
 * /api/tenant/branches:
 *   get:
 *     tags: [Branches]
 *     summary: List all branches
 */
export const getAllBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');

    // Attach stats to each branch
    const branchesWithStats = await Promise.all(branches.map(async (branch) => {
      const activeSessions = await BookingSessionModel.countDocuments({
        tenantId: req.tenantId,
        branchId: branch._id,
        bookingStatus: 'in_progress'
      });
      const staffCount = await StaffUser.countDocuments({
        tenantId: req.tenantId,
        branchId: branch._id,
        isActive: true
      });
      const resourceCount = await VenueResource.countDocuments({
        tenantId: req.tenantId,
        branchId: branch._id
      });
      return {
        ...branch.toObject(),
        stats: { activeSessions, staffCount, resourceCount }
      };
    }));

    return success(res, { data: branchesWithStats });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/branches/:id:
 *   get:
 *     tags: [Branches]
 *     summary: Get branch by ID with detailed stats
 */
export const getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!branch) {
      return error(res, { statusCode: 404, message: 'Branch not found', code: 'NOT_FOUND' });
    }

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const PaymentModel = getBusinessModel(req, 'Payment');

    const [resources, staff, activeSessions, todayPayments, todayExpenses] = await Promise.all([
      VenueResource.find({ tenantId: req.tenantId, branchId: branch._id }),
      StaffUser.find({ tenantId: req.tenantId, branchId: branch._id, isActive: true }),
      BookingSessionModel.countDocuments({ tenantId: req.tenantId, branchId: branch._id, bookingStatus: 'in_progress' }),
      PaymentModel.aggregate([
        { $match: {
          tenantId: req.tenantId,
          branchId: branch._id,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }},
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: {
          tenantId: req.tenantId,
          branchId: branch._id,
          date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }},
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const todayRevenue = todayPayments[0]?.total || 0;
    const todayExpenseTotal = todayExpenses[0]?.total || 0;

    return success(res, {
      data: {
        ...branch.toObject(),
        resources,
        staff,
        stats: {
          activeSessions,
          resourceCount: resources.length,
          staffCount: staff.length,
          todayRevenue,
          todayExpenses: todayExpenseTotal,
          todayProfit: todayRevenue - todayExpenseTotal
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/branches:
 *   post:
 *     tags: [Branches]
 *     summary: Create branch
 */
export const createBranch = async (req, res, next) => {
  try {
    const { name, code, address, city, state, contactPhone, operatingHours } = req.body;

    if (!name) {
      return error(res, { statusCode: 400, message: 'Branch name is required', code: 'MISSING_FIELDS' });
    }

    // Check branch limit
    const tenant = await Tenant.findById(req.tenantId).select('maxBranches').lean();
    const branchCount = await Branch.countDocuments({ tenantId: req.tenantId });
    if (branchCount >= (tenant?.maxBranches ?? 1)) {
      return error(res, {
        statusCode: 400,
        message: 'You\'ve reached the branch limit on your current plan. Please contact your administrator to upgrade your plan and unlock additional branches.',
        code: 'BRANCH_LIMIT_REACHED'
      });
    }

    const branch = await Branch.create({
      tenantId: req.tenantId,
      name,
      code: code || name.substring(0, 3).toUpperCase(),
      address,
      city,
      state,
      contactPhone,
      operatingHours: operatingHours || { open: '09:00', close: '23:00' }
    });

    return created(res, { data: branch });
  } catch (err) {
    if (err.code === 11000) {
      return error(res, { statusCode: 400, message: 'Branch with this code already exists', code: 'DUPLICATE' });
    }
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/branches/:id:
 *   put:
 *     tags: [Branches]
 *     summary: Update branch
 */
export const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!branch) {
      return error(res, { statusCode: 404, message: 'Branch not found', code: 'NOT_FOUND' });
    }

    const { name, code, address, city, state, contactPhone, operatingHours, isActive } = req.body;
    if (name) branch.name = name;
    if (code !== undefined) branch.code = code;
    if (address !== undefined) branch.address = address;
    if (city !== undefined) branch.city = city;
    if (state !== undefined) branch.state = state;
    if (contactPhone !== undefined) branch.contactPhone = contactPhone;
    if (operatingHours) branch.operatingHours = { ...branch.operatingHours, ...operatingHours };
    if (isActive !== undefined) branch.isActive = isActive;

    await branch.save();
    return success(res, { data: branch });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/branches/:id:
 *   delete:
 *     tags: [Branches]
 *     summary: Delete branch
 */
export const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!branch) {
      return error(res, { statusCode: 404, message: 'Branch not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Branch deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/branches/dashboard:
 *   get:
 *     tags: [Branches]
 *     summary: Get branch-wise dashboard overview
 */
export const getBranchDashboard = async (req, res, next) => {
  try {
    const branches = await Branch.find({ tenantId: req.tenantId, isActive: true });

    const BookingSessionModel = getBusinessModel(req, 'BookingSession');
    const PaymentModel = getBusinessModel(req, 'Payment');

    const branchData = await Promise.all(branches.map(async (branch) => {
      const [activeSessions, todayPayments, todayExpenses, staffCount] = await Promise.all([
        BookingSessionModel.countDocuments({ tenantId: req.tenantId, branchId: branch._id, bookingStatus: 'in_progress' }),
        PaymentModel.aggregate([
          { $match: { tenantId: req.tenantId, branchId: branch._id, createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          { $match: { tenantId: req.tenantId, branchId: branch._id, date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        StaffUser.countDocuments({ tenantId: req.tenantId, branchId: branch._id, isActive: true })
      ]);

      return {
        _id: branch._id,
        name: branch.name,
        code: branch.code,
        city: branch.city,
        isActive: branch.isActive,
        stats: {
          activeSessions,
          todayRevenue: todayPayments[0]?.total || 0,
          todayExpenses: todayExpenses[0]?.total || 0,
          staffCount
        }
      };
    }));

    return success(res, { data: branchData });
  } catch (err) {
    next(err);
  }
};
