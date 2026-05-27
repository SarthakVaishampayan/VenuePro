import StaffUser from '../../../modules/pool-snooker/models/StaffUser.js';
import Expense from '../../../modules/pool-snooker/models/Expense.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

const getMonthYear = (date = new Date()) => {
  const d = new Date(date);
  return {
    month: d.toLocaleString('default', { month: 'short' }),
    year: d.getFullYear()
  };
};

export const getAllStaff = async (req, res, next) => {
  try {
    const { active, role } = req.query;
    const filter = { tenantId: req.tenantId };

    if (active !== undefined) filter.isActive = active === 'true';
    if (role) filter.role = role;

    const staff = await StaffUser.find(filter).sort({ createdAt: -1 });
    return success(res, { data: staff });
  } catch (err) {
    next(err);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const staff = await StaffUser.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) {
      return error(res, { statusCode: 404, message: 'Staff member not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: staff });
  } catch (err) {
    next(err);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const { name, phone, email, role, monthlySalary, permissions, hasPortalAccess, password } = req.body;

    if (!name || !phone) {
      return error(res, { statusCode: 400, message: 'Name and phone are required', code: 'MISSING_FIELDS' });
    }

    const staff = await StaffUser.create({
      tenantId: req.tenantId,
      branchId: req.body.branchId || null,
      name,
      phone,
      email,
      role: role || 'staff',
      monthlySalary: monthlySalary || 0,
      permissions: permissions || {
        canManageResources: false,
        canManageSessions: false,
        canManagePayments: false,
        canManageCustomers: false,
        canManageStaff: false,
        canViewReports: false,
        canManageExpenses: false,
        canManageDues: false
      },
      hasPortalAccess: hasPortalAccess || false,
      password: password || undefined
    });

    return created(res, { data: staff });
  } catch (err) {
    next(err);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const staff = await StaffUser.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) {
      return error(res, { statusCode: 404, message: 'Staff member not found', code: 'NOT_FOUND' });
    }

    const { name, phone, email, role, monthlySalary, permissions, isActive, hasPortalAccess, password, clearPassword } = req.body;

    if (name) staff.name = name;
    if (phone) staff.phone = phone;
    if (email !== undefined) staff.email = email;
    if (role) staff.role = role;
    if (monthlySalary !== undefined) staff.monthlySalary = monthlySalary;
    if (permissions) staff.permissions = { ...staff.permissions, ...permissions };
    if (isActive !== undefined) staff.isActive = isActive;
    if (hasPortalAccess !== undefined) staff.hasPortalAccess = hasPortalAccess;

    if (clearPassword) {
      staff.password = undefined;
      staff.hasPortalAccess = false;
    } else if (password !== undefined) {
      if (password === '') {
        staff.password = undefined;
        staff.hasPortalAccess = false;
      } else {
        staff.password = password;
        staff.hasPortalAccess = true;
      }
    }

    await staff.save();
    return success(res, { data: staff });
  } catch (err) {
    next(err);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    const staff = await StaffUser.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) {
      return error(res, { statusCode: 404, message: 'Staff member not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Staff member deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const paySalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, amount } = req.body;

    const staff = await StaffUser.findOne({ _id: id, tenantId: req.tenantId });
    if (!staff) {
      return error(res, { statusCode: 404, message: 'Staff member not found', code: 'NOT_FOUND' });
    }

    let salaryAmount = 0;
    let paymentType = type;

    if (type === 'full') {
      salaryAmount = staff.monthlySalary;
      paymentType = 'full';
    } else if (type === 'half') {
      salaryAmount = Math.round(staff.monthlySalary / 2);
      paymentType = 'half';
    } else if (type === 'partial') {
      if (!amount || amount <= 0 || amount > staff.monthlySalary) {
        return error(res, { statusCode: 400, message: 'Invalid partial amount', code: 'INVALID_AMOUNT' });
      }
      salaryAmount = parseFloat(amount);
      paymentType = 'partial';
    } else {
      return error(res, { statusCode: 400, message: 'Invalid payment type. Use: full, half, or partial', code: 'INVALID_TYPE' });
    }

    const { month, year } = getMonthYear();

    const expense = await Expense.create({
      tenantId: req.tenantId,
      description: `Salary Payment - ${staff.name} (${paymentType})`,
      amount: salaryAmount,
      category: 'salary',
      date: new Date(),
      notes: `Salary payment for ${month} ${year}. Staff ID: ${staff._id}`,
      createdBy: req.user.name || 'owner'
    });

    const payment = { amount: salaryAmount, type: paymentType, date: new Date(), month, year };
    staff.payments.push(payment);
    await staff.save();

    return created(res, { data: { staff, expense, payment } });
  } catch (err) {
    next(err);
  }
};

export const getStaffAnalytics = async (req, res, next) => {
  try {
    const staff = await StaffUser.find({ tenantId: req.tenantId, isActive: true });

    const totalMonthlySalary = staff.reduce((sum, s) => sum + s.monthlySalary, 0);

    const allPayments = [];
    staff.forEach(s => {
      s.payments.forEach(p => {
        allPayments.push({
          staffName: s.name,
          staffId: s._id.toString(),
          amount: p.amount,
          type: p.type,
          month: p.month,
          year: p.year,
          date: p.date
        });
      });
    });

    const { month: currentMonth, year: currentYear } = getMonthYear();
    const thisMonthPayments = allPayments.filter(p => p.month === currentMonth && p.year === currentYear);
    const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    return success(res, {
      data: {
        totalStaff: staff.length,
        totalMonthlySalary,
        thisMonth: { total: thisMonthTotal, payments: thisMonthPayments.length },
        recentPayments: allPayments.slice(0, 10)
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getSalaryHistory = async (req, res, next) => {
  try {
    const staff = await StaffUser.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!staff) {
      return error(res, { statusCode: 404, message: 'Staff member not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: staff.payments });
  } catch (err) {
    next(err);
  }
};
