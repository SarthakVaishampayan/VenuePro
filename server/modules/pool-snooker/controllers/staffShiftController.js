import StaffShift from '../models/StaffShift.js';
import StaffUser from '../models/StaffUser.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';
import { logActivity } from './activityLogController.js';

/**
 * @swagger
 * /api/tenant/staff/shifts:
 *   get:
 *     tags: [Staff Shifts]
 *     summary: List shifts with filters
 */
export const getShifts = async (req, res, next) => {
  try {
    const { branchId, staffId, date, status, dateFrom, dateTo } = req.query;
    const filter = { tenantId: req.tenantId };

    if (branchId) filter.branchId = branchId;
    if (staffId) filter.staffId = staffId;
    if (status) filter.status = status;

    if (date) {
      const d = new Date(date);
      filter.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        $lte: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      };
    } else if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const shifts = await StaffShift.find(filter)
      .populate('staffId', 'name phone role')
      .sort({ date: -1, startTime: -1 })
      .lean();

    return success(res, { data: shifts });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/staff/shifts/today:
 *   get:
 *     tags: [Staff Shifts]
 *     summary: Get today's shifts
 */
export const getTodayShifts = async (req, res, next) => {
  try {
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const { branchId } = req.query;
    const filter = { tenantId: req.tenantId, date: { $gte: dayStart, $lte: dayEnd } };
    if (branchId) filter.branchId = branchId;

    const shifts = await StaffShift.find(filter)
      .populate('staffId', 'name phone role')
      .sort({ startTime: 1 })
      .lean();

    return success(res, { data: shifts });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/staff/shifts:
 *   post:
 *     tags: [Staff Shifts]
 *     summary: Create a shift assignment
 */
export const createShift = async (req, res, next) => {
  try {
    const { staffId, date, startTime, endTime, branchId, notes } = req.body;

    if (!staffId || !date || !startTime || !endTime) {
      return error(res, { statusCode: 400, message: 'Staff ID, date, start time, and end time are required', code: 'MISSING_FIELDS' });
    }

    // Verify staff exists
    const staff = await StaffUser.findOne({ _id: staffId, tenantId: req.tenantId });
    if (!staff) {
      return error(res, { statusCode: 404, message: 'Staff member not found', code: 'NOT_FOUND' });
    }

    // Check for overlapping shifts
    const shiftDate = new Date(date);
    const dayStart = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
    const dayEnd = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate(), 23, 59, 59, 999);

    const overlapping = await StaffShift.findOne({
      tenantId: req.tenantId,
      staffId,
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $nin: ['cancelled'] },
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (overlapping) {
      return error(res, { statusCode: 400, message: 'Staff member already has a shift in this time slot', code: 'OVERLAPPING_SHIFT' });
    }

    const branchToUse = branchId || staff.branchId || null;
    const shift = await StaffShift.create({
      tenantId: req.tenantId,
      branchId: branchToUse,
      staffId,
      date: shiftDate,
      startTime,
      endTime,
      notes
    });

    await logActivity({
      tenantId: req.tenantId,
      branchId: branchToUse,
      userId: req.user.id,
      userName: req.user.name || 'owner',
      userRole: req.user.role || 'owner_admin',
      action: 'create',
      entity: 'staff',
      entityId: shift._id,
      details: `Shift assigned to ${staff.name} (${startTime} - ${endTime})`
    });

    return created(res, { data: shift });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/staff/shifts/:id/check-in:
 *   patch:
 *     tags: [Staff Shifts]
 *     summary: Staff clock in
 */
export const checkIn = async (req, res, next) => {
  try {
    const shift = await StaffShift.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!shift) {
      return error(res, { statusCode: 404, message: 'Shift not found', code: 'NOT_FOUND' });
    }
    if (shift.status !== 'scheduled') {
      return error(res, { statusCode: 400, message: `Cannot check in. Shift is ${shift.status}`, code: 'INVALID_STATUS' });
    }

    shift.status = 'checked_in';
    shift.checkedInAt = new Date();
    await shift.save();

    await logActivity({
      tenantId: req.tenantId,
      branchId: shift.branchId,
      userId: req.user.id,
      userName: req.user.name || 'staff',
      userRole: req.user.role || 'staff',
      action: 'check_in',
      entity: 'staff',
      entityId: shift._id,
      details: `Staff checked in for shift on ${shift.date.toLocaleDateString()}`
    });

    return success(res, { data: shift });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/staff/shifts/:id/check-out:
 *   patch:
 *     tags: [Staff Shifts]
 *     summary: Staff clock out
 */
export const checkOut = async (req, res, next) => {
  try {
    const shift = await StaffShift.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!shift) {
      return error(res, { statusCode: 404, message: 'Shift not found', code: 'NOT_FOUND' });
    }
    if (shift.status !== 'checked_in') {
      return error(res, { statusCode: 400, message: `Cannot check out. Shift is ${shift.status}`, code: 'INVALID_STATUS' });
    }

    shift.status = 'checked_out';
    shift.checkedOutAt = new Date();
    await shift.save();

    return success(res, { data: shift });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/staff/shifts/:id:
 *   put:
 *     tags: [Staff Shifts]
 *     summary: Update shift
 */
export const updateShift = async (req, res, next) => {
  try {
    const shift = await StaffShift.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!shift) {
      return error(res, { statusCode: 404, message: 'Shift not found', code: 'NOT_FOUND' });
    }

    const { startTime, endTime, status, notes } = req.body;
    if (startTime) shift.startTime = startTime;
    if (endTime) shift.endTime = endTime;
    if (status) shift.status = status;
    if (notes !== undefined) shift.notes = notes;

    await shift.save();
    return success(res, { data: shift });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/staff/shifts/:id:
 *   delete:
 *     tags: [Staff Shifts]
 *     summary: Delete shift
 */
export const deleteShift = async (req, res, next) => {
  try {
    const shift = await StaffShift.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!shift) {
      return error(res, { statusCode: 404, message: 'Shift not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Shift deleted successfully' });
  } catch (err) {
    next(err);
  }
};
