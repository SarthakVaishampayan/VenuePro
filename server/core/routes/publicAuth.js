// ============================================================
// PUBLIC AUTH ROUTES — Self-Service Signup
// ============================================================
// These routes require NO authentication.
// They allow prospective tenants to sign up for a trial.

import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { error as errorResponse, success as successResponse } from '../utils/responseHelper.js';
import { logger } from '../config/logger.js';
import BusinessType from '../models/BusinessType.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import tenantProvisioningService from '../services/tenantProvisioningService.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const signupSchema = z.object({
  // Account info
  ownerName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  ownerEmail: z.string().email('Invalid email format').toLowerCase().trim(),
  ownerPhone: z.string().min(10, 'Valid phone number required').max(20),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),

  // Business info
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100),
  businessTypeKey: z.string().min(1, 'Business type is required'),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  timezone: z.string().default('Asia/Kolkata'),
  currency: z.string().default('INR'),

  // Plan selection
  planKey: z.string().optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'semi_annual', 'yearly']).default('monthly')
});

// ============================================================
// GET /api/public/business-types
// ============================================================

/**
 * @swagger
 * /api/public/business-types:
 *   get:
 *     tags: [Public]
 *     summary: List active business types for signup
 *     responses:
 *       200:
 *         description: List of active business types
 */
router.get('/business-types', async (req, res, next) => {
  try {
    const types = await BusinessType.find({ status: 'active' })
      .select('key name description labels pricingStrategy bookingMode icon sortOrder')
      .sort({ sortOrder: 1 })
      .lean();

    return successResponse(res, { data: types });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/public/subscription-plans
// ============================================================

/**
 * @swagger
 * /api/public/subscription-plans:
 *   get:
 *     tags: [Public]
 *     summary: List visible subscription plans for pricing page
 *     responses:
 *       200:
 *         description: List of visible plans
 */
router.get('/subscription-plans', async (req, res, next) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true, isVisible: true })
      .select('name key description prices features limits trialDays sortOrder badge')
      .sort({ sortOrder: 1 })
      .lean();

    return successResponse(res, { data: plans });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/public/auth/signup
// ============================================================

/**
 * @swagger
 * /api/public/auth/signup:
 *   post:
 *     tags: [Public]
 *     summary: Self-service tenant signup
 *     description: Create a new tenant with trial subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ownerName, ownerEmail, ownerPhone, password, businessName, businessTypeKey]
 *             properties:
 *               ownerName: { type: string }
 *               ownerEmail: { type: string }
 *               ownerPhone: { type: string }
 *               password: { type: string }
 *               businessName: { type: string }
 *               businessTypeKey: { type: string }
 *               planKey: { type: string, enum: [free, starter, professional, enterprise] }
 *               billingCycle: { type: string, enum: [monthly, quarterly, yearly] }
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/auth/signup', authLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    const {
      ownerName, ownerEmail, ownerPhone, password,
      businessName, businessTypeKey,
      address, city, state, timezone, currency,
      planKey, billingCycle
    } = req.body;

    // 1. Resolve business type
    const businessType = await BusinessType.findOne({ key: businessTypeKey, status: 'active' });
    if (!businessType) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Business type '${businessTypeKey}' is not available.`,
        code: 'INVALID_BUSINESS_TYPE'
      });
    }

    // 2. Provision tenant (with password hash override)
    const result = await tenantProvisioningService.provision({
      businessName,
      businessTypeId: businessType._id,
      ownerName,
      ownerEmail,
      ownerPhone,
      address: address ? { street: address, city, state } : {},
      timezone,
      currency,
      planKey,
      billingCycle,
      passwordOverride: password, // Service will hash this
      provisionedBy: null // Self-service signup
    });

    logger.info(`Self-service signup: ${businessName} (${result.tenant.tenantCode})`);

    return successResponse(res, {
      statusCode: 201,
      message: 'Your account has been created successfully! Check your email for login details.',
      data: {
        tenant: {
          id: result.tenant._id,
          businessName: result.tenant.businessName,
          businessType: businessType.key,
          tenantCode: result.tenant.tenantCode
        },
        subscription: {
          plan: result.plan.name,
          status: result.subscription.status,
          trialEndsAt: result.subscription.trialEndDate
        }
      }
    });
  } catch (err) {
    // Handle duplicate email
    if (err.code === 11000 || err.message?.includes('duplicate key')) {
      return errorResponse(res, {
        statusCode: 409,
        message: 'An account with this email is already registered. Please login instead.',
        code: 'DUPLICATE_EMAIL'
      });
    }
    next(err);
  }
});

// ============================================================
// GET /api/public/web3forms-key
// ============================================================

/**
 * @swagger
 * /api/public/web3forms-key:
 *   get:
 *     tags: [Public]
 *     summary: Get the Web3Forms access key for the contact form
 *     responses:
 *       200:
 *         description: Returns the Web3Forms access key
 */
router.get('/web3forms-key', (req, res) => {
  const key = process.env.WEB3FORMS_ACCESS_KEY || process.env.VITE_WEB3FORMS_ACCESS_KEY || '';
  return successResponse(res, { data: { key } });
});

// ============================================================
// Schemas — Contact Inquiry
// ============================================================

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email').toLowerCase().trim(),
  phone: z.string().optional(),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100).optional(),
  businessType: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000)
});

// ============================================================
// POST /api/public/contact
// ============================================================

/**
 * @swagger
 * /api/public/contact:
 *   post:
 *     tags: [Public]
 *     summary: Submit a sales/contact inquiry
 *     description: Sends an inquiry notification to the sales team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               businessName: { type: string }
 *               businessType: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Inquiry submitted successfully
 *       400:
 *         description: Validation error
 */
router.post('/contact', validateBody(contactSchema), async (req, res, next) => {
  try {
    const { name, email, phone, businessName, businessType, message } = req.body;

    await emailService.sendContactInquiry({
      name, email, phone, businessName, businessType, message
    });

    logger.info(`Contact inquiry received from ${name} (${email})`);

    return successResponse(res, {
      message: 'Thank you for reaching out! Our team will get back to you within 24 hours.'
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
