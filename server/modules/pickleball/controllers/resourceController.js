import Court from '../models/Court.js';
import Tenant from '../../../core/models/Tenant.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

export const getAllResources = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const resources = await Court.find(filter).sort({ createdAt: -1 });
    return success(res, { data: resources });
  } catch (err) {
    next(err);
  }
};

export const getResourceById = async (req, res, next) => {
  try {
    const resource = await Court.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Court not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const createResource = async (req, res, next) => {
  try {
    const { name, category, dayPrice, nightPrice, status, capacity, notes, pricingRules } = req.body;

    if (!name || dayPrice === undefined || nightPrice === undefined) {
      return error(res, { statusCode: 400, message: 'Name, day price, and night price are required', code: 'MISSING_FIELDS' });
    }

    const existing = await Court.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return error(res, { statusCode: 400, message: 'Court with this name already exists', code: 'DUPLICATE' });
    }

    const tenant = await Tenant.findById(req.tenantId).select('maxResources').lean();
    if (tenant) {
      const resourceCount = await Court.countDocuments({ tenantId: req.tenantId });
      if (resourceCount >= tenant.maxResources) {
        const planNames = { 2: 'Free / Trial', 15: 'Starter', 50: 'Professional', 9999: 'Enterprise' };
        return error(res, {
          statusCode: 403,
          message: `Your ${planNames[tenant.maxResources] || 'current'} plan allows up to ${tenant.maxResources} resources. Upgrade your plan to create more.`,
          code: 'TIER_LIMIT_REACHED'
        });
      }
    }

    const resource = await Court.create({
      tenantId: req.tenantId,
      branchId: req.body.branchId || null,
      name,
      category: category || 'standard',
      dayPrice,
      nightPrice,
      status: status || 'available',
      capacity: capacity || 4,
      notes,
      pricingRules: pricingRules || []
    });

    return created(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const updateResource = async (req, res, next) => {
  try {
    const resource = await Court.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Court not found', code: 'NOT_FOUND' });
    }

    const { name, category, dayPrice, nightPrice, status, capacity, notes, pricingRules } = req.body;
    if (name) resource.name = name;
    if (category) resource.category = category;
    if (dayPrice !== undefined) resource.dayPrice = dayPrice;
    if (nightPrice !== undefined) resource.nightPrice = nightPrice;
    if (status) resource.status = status;
    if (capacity !== undefined) resource.capacity = capacity;
    if (notes !== undefined) resource.notes = notes;
    if (pricingRules) resource.pricingRules = pricingRules;

    await resource.save();
    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const toggleResourceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'occupied', 'maintenance', 'disabled'].includes(status)) {
      return error(res, { statusCode: 400, message: 'Invalid status', code: 'INVALID_STATUS' });
    }

    const resource = await Court.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { new: true }
    );

    if (!resource) {
      return error(res, { statusCode: 404, message: 'Court not found', code: 'NOT_FOUND' });
    }

    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const resource = await Court.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Court not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Court deleted successfully' });
  } catch (err) {
    next(err);
  }
};
