import GamingResource from '../models/GamingResource.js';
import Tenant from '../../../core/models/Tenant.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

export const getAllResources = async (req, res, next) => {
  try {
    const { status, category, resourceType, platform, tableType } = req.query;
    const filter = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (resourceType) filter.resourceType = resourceType;
    if (platform) filter.platform = platform;
    if (tableType) filter.tableType = tableType;

    const resources = await GamingResource.find(filter).sort({ createdAt: -1 });
    return success(res, { data: resources });
  } catch (err) {
    next(err);
  }
};

export const getResourceById = async (req, res, next) => {
  try {
    const resource = await GamingResource.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const createResource = async (req, res, next) => {
  try {
    const { name, resourceType, platform, tableType, category, dayPrice, nightPrice, status, capacity, notes, pricingRules } = req.body;

    if (!name || dayPrice === undefined || nightPrice === undefined) {
      return error(res, { statusCode: 400, message: 'Name, day price, and night price are required', code: 'MISSING_FIELDS' });
    }

    const existing = await GamingResource.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return error(res, { statusCode: 400, message: 'Resource with this name already exists', code: 'DUPLICATE' });
    }

    const tenant = await Tenant.findById(req.tenantId).select('maxResources').lean();
    if (tenant) {
      const resourceCount = await GamingResource.countDocuments({ tenantId: req.tenantId });
      if (resourceCount >= tenant.maxResources) {
        const planNames = { 5: 'Free / Trial', 15: 'Starter', 50: 'Professional', 9999: 'Enterprise' };
        return error(res, {
          statusCode: 403,
          message: `Your ${planNames[tenant.maxResources] || 'current'} plan allows up to ${tenant.maxResources} resources. Upgrade your plan to create more.`,
          code: 'TIER_LIMIT_REACHED'
        });
      }
    }

    const resource = await GamingResource.create({
      tenantId: req.tenantId,
      branchId: req.body.branchId || null,
      name,
      resourceType: resourceType || 'console',
      platform: resourceType === 'console' ? (platform || 'PS5') : undefined,
      tableType: resourceType === 'table' ? (tableType || 'pool') : undefined,
      category: category || 'standard',
      dayPrice,
      nightPrice,
      status: status || 'available',
      capacity: capacity || 2,
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
    const resource = await GamingResource.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
    }

    const { name, resourceType, platform, tableType, category, dayPrice, nightPrice, status, capacity, notes, pricingRules } = req.body;
    if (name) resource.name = name;
    if (resourceType) resource.resourceType = resourceType;
    if (platform) resource.platform = platform;
    if (tableType) resource.tableType = tableType;
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

    const resource = await GamingResource.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { status },
      { new: true }
    );

    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
    }

    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

export const deleteResource = async (req, res, next) => {
  try {
    const resource = await GamingResource.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Resource deleted successfully' });
  } catch (err) {
    next(err);
  }
};
