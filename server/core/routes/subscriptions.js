import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { auditLogMiddleware } from '../middleware/auditLogger.js';
import { success as successResponse, error as errorResponse } from '../utils/responseHelper.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  key: z.string().optional(),
  description: z.string().max(500).optional(),
  prices: z.object({
    monthly: z.number().min(0).default(0),
    quarterly: z.number().min(0).default(0),
    semiAnnual: z.number().min(0).default(0),
    yearly: z.number().min(0).default(0)
  }),
  features: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    included: z.boolean().default(false)
  })).optional(),
  limits: z.object({
    branches: z.number().int().min(0).default(1),
    resources: z.number().int().min(0).default(5),
    staff: z.number().int().min(0).default(2),
    storage: z.number().int().min(0).default(100),
    apiRequests: z.number().int().min(0).default(1000)
  }).optional(),
  trialDays: z.number().int().min(0).max(90).default(14),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isVisible: z.boolean().default(true),
  badge: z.string().nullable().optional()
});

const updatePlanSchema = createPlanSchema.partial();

// ============================================================
// GET /api/platform/subscription-plans
// ============================================================

/**
 * @swagger
 * /api/platform/subscription-plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: List all subscription plans
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of plans
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.active !== undefined) {
      filter.isActive = req.query.active === 'true';
    }

    const plans = await SubscriptionPlan.find(filter)
      .sort({ sortOrder: 1 })
      .lean();

    return successResponse(res, { data: plans });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/subscription-plans/public
// ============================================================

/**
 * @swagger
 * /api/platform/subscription-plans/public:
 *   get:
 *     tags: [Subscriptions]
 *     summary: List visible plans (public)
 *     description: No auth required — used for signup/pricing page
 *     responses:
 *       200:
 *         description: List of visible plans
 */
router.get('/public', async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true, isVisible: true })
      .select('key name description prices features limits trialDays sortOrder badge')
      .sort({ sortOrder: 1 })
      .lean();

    return successResponse(res, { data: plans });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/subscription-plans
// ============================================================

/**
 * @swagger
 * /api/platform/subscription-plans:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Create subscription plan
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Plan created
 */
router.post('/', superAdminAuth, validateBody(createPlanSchema), auditLogMiddleware('create', 'subscriptions'), async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);

    return successResponse(res, {
      statusCode: 201,
      message: 'Subscription plan created successfully',
      data: plan
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/subscription-plans/:id
// ============================================================

/**
 * @swagger
 * /api/platform/subscription-plans/{id}:
 *   patch:
 *     tags: [Subscriptions]
 *     summary: Update subscription plan
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Plan updated
 */
router.patch('/:id', superAdminAuth, validateBody(updatePlanSchema), auditLogMiddleware('update', 'subscriptions'), async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription plan not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Subscription plan updated successfully',
      data: plan
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /api/platform/subscription-plans/:id
// ============================================================

/**
 * @swagger
 * /api/platform/subscription-plans/{id}:
 *   delete:
 *     tags: [Subscriptions]
 *     summary: Delete subscription plan
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Plan deleted
 */
router.delete('/:id', superAdminAuth, auditLogMiddleware('delete', 'subscriptions'), async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Subscription plan not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Subscription plan deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
