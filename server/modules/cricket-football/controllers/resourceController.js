import Turf from '../models/Turf.js';
import Tenant from '../../../core/models/Tenant.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

export const getAllResources = async (req, res, next) => {
  try {
    const { status, category, sportType } = req.query;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (sportType) filter.sportType = sportType;

    const resources = await Turf.find(filter).sort({ createdAt: -1 });
    return success(res, { data: resources });
  } catch (err) {
    next(err);
  }
};

export const getResourceById = async (req, res, next) => {
  try {
    const resource = await Turf.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Turf not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const createResource = async (req, res, next) => {
  try {
    const { name, category, dayPrice, nightPrice, status, capacity, notes, pricingRules, sportType } = req.body;

    if (!name || dayPrice === undefined || nightPrice === undefined) {
      return error(res, { statusCode: 400, message: 'Name, day price, and night price are required', code: 'MISSING_FIELDS' });
    }

    const existing = await Turf.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return error(res, { statusCode: 400, message: 'Turf with this name already exists', code: 'DUPLICATE' });
    }

    const tenant = await Tenant.findById(req.tenantId).select('maxResources').lean();
    if (tenant) {
      const resourceCount = await Turf.countDocuments({ tenantId: req.tenantId });
      if (resourceCount >= tenant.maxResources) {
        const planNames = { 2: 'Free / Trial', 15: 'Starter', 50: 'Professional', 9999: 'Enterprise' };
        return error(res, {
          statusCode: 403,
          message: `Your ${planNames[tenant.maxResources] || 'current'} plan allows up to ${tenant.maxResources} resources. Upgrade your plan to create more.`,
          code: 'TIER_LIMIT_REACHED'
        });
      }
    }

    const resource = await Turf.create({
      tenantId: req.tenantId,
      branchId: req.body.branchId || null,
      name,
      category: category || 'standard',
      sportType: sportType || 'multipurpose',
      dayPrice,
      nightPrice,
      status: status || 'available',
      capacity: capacity || 22,
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
    const resource = await Turf.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Turf not found', code: 'NOT_FOUND' });
    }

    const { name, category, dayPrice, nightPrice, status, capacity, notes, pricingRules, sportType } = req.body;
    if (name) resource.name = name;
    if (category) resource.category = category;
    if (sportType) resource.sportType = sportType;
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

    const resource = await Turf.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { new: true }
    );

    if (!resource) {
      return error(res, { statusCode: 404, message: 'Turf not found', code: 'NOT_FOUND' });
    }

    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const resource = await Turf.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Turf not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Turf deleted successfully' });
  } catch (err) {
    next(err);
  }
};
