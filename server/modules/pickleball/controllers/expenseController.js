import Expense from '../../../modules/pool-snooker/models/Expense.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

export const getAllExpenses = async (req, res, next) => {
  try {
    const { category, dateFrom, dateTo, limit } = req.query;
    const filter = { tenantId: req.tenantId };

    if (category) filter.category = category;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    let query = Expense.find(filter).sort({ date: -1 });
    if (limit) query = query.limit(parseInt(limit));

    const expenses = await query;
    return success(res, { data: expenses });
  } catch (err) {
    next(err);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!expense) {
      return error(res, { statusCode: 404, message: 'Expense not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: expense });
  } catch (err) {
    next(err);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const { description, amount, category, date, paymentMode, notes } = req.body;

    if (!description || amount === undefined || !category) {
      return error(res, { statusCode: 400, message: 'Description, amount, and category are required', code: 'MISSING_FIELDS' });
    }

    const expense = await Expense.create({
      tenantId: req.tenantId,
      description,
      amount: parseFloat(amount),
      category,
      paymentMode: paymentMode || 'cash',
      date: date ? new Date(date) : new Date(),
      notes,
      createdBy: req.user.name || 'owner'
    });

    return created(res, { data: expense });
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!expense) {
      return error(res, { statusCode: 404, message: 'Expense not found', code: 'NOT_FOUND' });
    }

    const { description, amount, category, date, paymentMode, notes } = req.body;
    if (description) expense.description = description;
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (category) expense.category = category;
    if (date) expense.date = new Date(date);
    if (paymentMode) expense.paymentMode = paymentMode;
    if (notes !== undefined) expense.notes = notes;

    await expense.save();
    return success(res, { data: expense });
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!expense) {
      return error(res, { statusCode: 404, message: 'Expense not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const getExpenseAnalytics = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ tenantId: req.tenantId }).sort({ date: -1 });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayExpenses = expenses.filter(e => new Date(e.date) >= today);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryBreakdown = {};
    expenses.forEach(e => {
      if (!categoryBreakdown[e.category]) {
        categoryBreakdown[e.category] = { total: 0, count: 0 };
      }
      categoryBreakdown[e.category].total += e.amount;
      categoryBreakdown[e.category].count += 1;
    });

    const dailyExpenses = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const dayExpenses = expenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate >= dayStart && expDate <= dayEnd;
      });

      dailyExpenses.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
        count: dayExpenses.length
      });
    }

    const monthlyExpenses = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      const monthStart = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });

      monthlyExpenses.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
        count: monthExpenses.length
      });
    }

    return success(res, {
      data: {
        totalExpenses,
        todayExpenses: todayTotal,
        count: expenses.length,
        categoryBreakdown,
        dailyExpenses,
        monthlyExpenses
      }
    });
  } catch (err) {
    next(err);
  }
};
