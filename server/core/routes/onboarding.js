import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/tenantMiddleware.js';
import { success as successResponse, error as errorResponse } from '../utils/responseHelper.js';
import Tenant from '../models/Tenant.js';

const router = express.Router();

// ============================================================
// Onboarding Steps Definition
// ============================================================

const ONBOARDING_STEPS = [
  { key: 'welcome', label: 'Welcome', description: 'Welcome to VenuePro! Let\'s get you started.' },
  { key: 'profile', label: 'Business Profile', description: 'Set up your business details and preferences.' },
  { key: 'resources', label: 'Create Resources', description: 'Add your first resource (table, court, turf, etc.).' },
  { key: 'staff', label: 'Add Staff', description: 'Invite your team members to manage operations.' },
  { key: 'settings', label: 'Configure Settings', description: 'Configure operating hours, pricing rules, and more.' },
  { key: 'tour', label: 'Quick Tour', description: 'Take a quick tour of your dashboard and key features.' },
  { key: 'complete', label: 'All Set!', description: 'You\'re ready to start accepting bookings.' }
];

// ============================================================
// Schemas
// ============================================================

const updateOnboardingSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  step: z.number().int().min(0).max(ONBOARDING_STEPS.length - 1).optional()
});

// ============================================================
// GET /api/platform/onboarding/meta
// ============================================================

/**
 * @swagger
 * /api/platform/onboarding/meta:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding steps metadata
 *     responses:
 *       200:
 *         description: Onboarding steps
 */
router.get('/meta', async (req, res, next) => {
  try {
    return successResponse(res, {
      data: {
        steps: ONBOARDING_STEPS,
        totalSteps: ONBOARDING_STEPS.length
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/tenants/:id/onboarding
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}/onboarding:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get tenant onboarding status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Onboarding status
 */
router.get('/:id', superAdminAuth, validateObjectId('id'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id).select('onboardingStatus onboardingStep businessName ownerName');
    if (!tenant) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant not found.',
        code: 'NOT_FOUND'
      });
    }

    const currentStep = ONBOARDING_STEPS[tenant.onboardingStep] || ONBOARDING_STEPS[0];

    return successResponse(res, {
      data: {
        tenantId: tenant._id,
        status: tenant.onboardingStatus,
        currentStep: tenant.onboardingStep,
        currentStepInfo: currentStep,
        steps: ONBOARDING_STEPS,
        progress: Math.round((tenant.onboardingStep / (ONBOARDING_STEPS.length - 1)) * 100),
        isComplete: tenant.onboardingStatus === 'completed',
        isSkipped: tenant.onboardingStatus === 'skipped'
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/tenants/:id/onboarding
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}/onboarding:
 *   patch:
 *     tags: [Onboarding]
 *     summary: Update onboarding progress
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, skipped]
 *               step:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Onboarding updated
 */
router.patch('/:id', superAdminAuth, validateObjectId('id'), validateBody(updateOnboardingSchema), async (req, res, next) => {
  try {
    const update = {};
    if (req.body.status !== undefined) update.onboardingStatus = req.body.status;
    if (req.body.step !== undefined) update.onboardingStep = req.body.step;

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select('onboardingStatus onboardingStep businessName');

    if (!tenant) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Onboarding updated successfully',
      data: {
        tenantId: tenant._id,
        status: tenant.onboardingStatus,
        currentStep: tenant.onboardingStep
      }
    });
  } catch (err) {
    next(err);
  }
});

export { router, ONBOARDING_STEPS };
export default router;
