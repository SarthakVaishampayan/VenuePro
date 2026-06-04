import VenueResource from '../models/VenueResource.js';
import Tenant from '../../../core/models/Tenant.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';

/**
 * @swagger
 * /api/tenant/resources:
 *   get:
 *     tags: [Resources]
 *     summary: List all resources
 */
export const getAllResources = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const filter = { tenantId: req.tenantId };

    if (status) filter.status = status;
    if (category) filter.category = category;

    const resources = await VenueResource.find(filter).sort({ createdAt: -1 });
    return success(res, { data: resources });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/resources/:id:
 *   get:
 *     tags: [Resources]
 *     summary: Get resource by ID
 */
export const getResourceById = async (req, res, next) => {
  try {
    const resource = await VenueResource.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
    }
    return success(res, { data: resource });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/resources:
 *   post:
 *     tags: [Resources]
 *     summary: Create resource
 */
export const createResource = async (req, res, next) => {
  try {
    const { name, category, dayPrice, nightPrice, status, capacity, notes, pricingRules } = req.body;

    if (!name || dayPrice === undefined || nightPrice === undefined) {
      return error(res, { statusCode: 400, message: 'Name, day price, and night price are required', code: 'MISSING_FIELDS' });
    }

    const existing = await VenueResource.findOne({ tenantId: req.tenantId, name });
    if (existing) {
      return error(res, { statusCode: 400, message: 'Resource with this name already exists', code: 'DUPLICATE' });
    }

    // Check tenant tier resource limit
    const tenant = await Tenant.findById(req.tenantId).select('maxResources').lean();
    if (tenant) {
      const resourceCount = await VenueResource.countDocuments({ tenantId: req.tenantId });
      if (resourceCount >= tenant.maxResources) {
        const planNames = { 2: 'Free / Trial', 15: 'Starter', 50: 'Professional', 9999: 'Enterprise' };
        const planName = planNames[tenant.maxResources] || 'current';
        return error(res, {
          statusCode: 403,
          message: `Your ${planName} plan allows up to ${tenant.maxResources} resources. Upgrade your plan to create more.`,
          code: 'TIER_LIMIT_REACHED'
        });
      }
    }

    const resource = await VenueResource.create({
      tenantId: req.tenantId,
      branchId: req.body.branchId || null,
      name,
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

/**
 * @swagger
 * /api/tenant/resources/:id:
 *   put:
 *     tags: [Resources]
 *     summary: Update resource
 */
export const updateResource = async (req, res, next) => {
  try {
    const resource = await VenueResource.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
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

/**
 * @swagger
 * /api/tenant/resources/:id/status:
 *   patch:
 *     tags: [Resources]
 *     summary: Toggle resource status
 */
export const toggleResourceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['available', 'occupied', 'maintenance', 'disabled'].includes(status)) {
      return error(res, { statusCode: 400, message: 'Invalid status', code: 'INVALID_STATUS' });
    }

    const resource = await VenueResource.findOneAndUpdate(
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

/**
 * @swagger
 * /api/tenant/resources/:id:
 *   delete:
 *     tags: [Resources]
 *     summary: Delete resource
 */
export const deleteResource = async (req, res, next) => {
  try {
    const resource = await VenueResource.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!resource) {
      return error(res, { statusCode: 404, message: 'Resource not found', code: 'NOT_FOUND' });
    }
    return success(res, { message: 'Resource deleted successfully' });
  } catch (err) {
    next(err);
  }
};
