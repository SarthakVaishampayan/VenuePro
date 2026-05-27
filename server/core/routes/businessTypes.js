import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { auditLogMiddleware } from '../middleware/auditLogger.js';
import { success as successResponse, error as errorResponse } from '../utils/responseHelper.js';
import BusinessType from '../models/BusinessType.js';
import { BUSINESS_TYPES } from '../config/constants.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const createBusinessTypeSchema = z.object({
  key: z.string().min(3).max(30).regex(/^[a-z_]+$/),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  labels: z.object({
    resourceSingular: z.string().min(1),
    resourcePlural: z.string().min(1),
    bookingSingular: z.string().min(1),
    bookingPlural: z.string().min(1),
    customerSingular: z.string().min(1),
    customerPlural: z.string().min(1)
  }),
  pricingStrategy: z.enum(['time_based', 'slot_based', 'configurable']),
  bookingMode: z.enum(['session', 'slot', 'configurable']),
  enabledModules: z.array(z.enum(['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers', 'booking_portal'])).optional(),
  defaultSettings: z.object({
    roundingMinutes: z.number().int().min(1).max(60).optional(),
    roundStartDown: z.boolean().optional(),
    roundEndUp: z.boolean().optional(),
    roundAmountToNearest: z.number().int().min(1).max(100).optional(),
    slotDurationMinutes: z.number().int().min(15).max(480).optional(),
    bufferBetweenSlots: z.number().int().min(0).max(120).optional()
  }).optional(),
  sortOrder: z.number().int().optional(),
  isDefault: z.boolean().optional()
});

const updateBusinessTypeSchema = createBusinessTypeSchema.partial();

// ============================================================
// GET /api/platform/business-types
// ============================================================

/**
 * @swagger
 * /api/platform/business-types:
 *   get:
 *     tags: [Business Types]
 *     summary: List all business types
 *     description: Get all configured business types
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of business types
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const types = await BusinessType.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return successResponse(res, { data: types });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/business-types/public
// ============================================================

/**
 * @swagger
 * /api/platform/business-types/public:
 *   get:
 *     tags: [Business Types]
 *     summary: List active business types (public)
 *     description: No auth required — used for signup page
 *     responses:
 *       200:
 *         description: List of active business types
 */
router.get('/public', async (req, res, next) => {
  try {
    const types = await BusinessType.find({ status: 'active' })
      .select('key name description labels icon sortOrder')
      .sort({ sortOrder: 1 })
      .lean();

    return successResponse(res, { data: types });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/business-types
// ============================================================

/**
 * @swagger
 * /api/platform/business-types:
 *   post:
 *     tags: [Business Types]
 *     summary: Create a new business type
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Business type created
 */
router.post('/', superAdminAuth, validateBody(createBusinessTypeSchema), auditLogMiddleware('create', 'business_types'), async (req, res, next) => {
  try {
    const existing = await BusinessType.findOne({ key: req.body.key });
    if (existing) {
      return errorResponse(res, {
        statusCode: 409,
        message: `Business type with key '${req.body.key}' already exists.`,
        code: 'DUPLICATE_KEY'
      });
    }

    const type = await BusinessType.create(req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'Business type created successfully',
      data: type
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/business-types/:id
// ============================================================

/**
 * @swagger
 * /api/platform/business-types/{id}:
 *   get:
 *     tags: [Business Types]
 *     summary: Get business type details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Business type details
 */
router.get('/:id', superAdminAuth, async (req, res, next) => {
  try {
    const type = await BusinessType.findById(req.params.id);
    if (!type) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Business type not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, { data: type });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/business-types/:id
// ============================================================

/**
 * @swagger
 * /api/platform/business-types/{id}:
 *   patch:
 *     tags: [Business Types]
 *     summary: Update business type
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Business type updated
 */
router.patch('/:id', superAdminAuth, validateBody(updateBusinessTypeSchema), auditLogMiddleware('update', 'business_types'), async (req, res, next) => {
  try {
    const type = await BusinessType.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!type) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Business type not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Business type updated successfully',
      data: type
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /api/platform/business-types/:id
// ============================================================

/**
 * @swagger
 * /api/platform/business-types/{id}:
 *   delete:
 *     tags: [Business Types]
 *     summary: Delete business type
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Business type deleted
 */
router.delete('/:id', superAdminAuth, auditLogMiddleware('delete', 'business_types'), async (req, res, next) => {
  try {
    const type = await BusinessType.findByIdAndDelete(req.params.id);
    if (!type) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Business type not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Business type deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
