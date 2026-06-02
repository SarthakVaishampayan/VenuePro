import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/tenantMiddleware.js';
import { auditLogMiddleware } from '../middleware/auditLogger.js';
import { success as successResponse, error as errorResponse, paginationMeta } from '../utils/responseHelper.js';
import { hashPassword, generateTemporaryPassword } from '../utils/passwordHelper.js';
import Tenant from '../models/Tenant.js';
import TenantSubscription from '../models/TenantSubscription.js';
import SubscriptionInvoice from '../models/SubscriptionInvoice.js';
import OwnerUser from '../../modules/pool-snooker/models/OwnerUser.js';
import tenantProvisioningService from '../services/tenantProvisioningService.js';
import auditService from '../services/auditService.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const createTenantSchema = z.object({
  businessName: z.string().min(2).max(200),
  businessTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  ownerName: z.string().min(2).max(100),
  ownerEmail: z.string().email().toLowerCase().trim(),
  ownerPhone: z.string().regex(/^[+]?[0-9]{10,15}$/),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional()
  }).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  planKey: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  trialDays: z.number().int().min(0).max(90).optional()
});

const updateTenantSchema = z.object({
  businessName: z.string().min(2).max(200).optional(),
  ownerName: z.string().min(2).max(100).optional(),
  ownerEmail: z.string().email().toLowerCase().trim().optional(),
  ownerPhone: z.string().regex(/^[+]?[0-9]{10,15}$/).optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional()
  }).optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  portalStatus: z.enum(['active', 'suspended', 'disabled']).optional(),
  maxBranches: z.number().int().min(0).optional(),
  maxResources: z.number().int().min(0).optional(),
  maxStaff: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional()
});

// ============================================================
// GET /api/platform/tenants
// ============================================================

/**
 * @swagger
 * /api/platform/tenants:
 *   get:
 *     tags: [Tenants]
 *     summary: List all tenants
 *     description: Get paginated list of tenants with optional filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         description: Filter by subscription status
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by business name or owner
 *     responses:
 *       200:
 *         description: List of tenants
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter['subscription.status'] = req.query.status;
    }
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { businessName: searchRegex },
        { ownerName: searchRegex },
        { ownerEmail: searchRegex },
        { ownerPhone: searchRegex }
      ];
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(filter)
        .populate('businessTypeId', 'key name labels')
        .populate('subscription.planId', 'name key')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tenant.countDocuments(filter)
    ]);

    return successResponse(res, {
      data: tenants,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/tenants
// ============================================================

/**
 * @swagger
 * /api/platform/tenants:
 *   post:
 *     tags: [Tenants]
 *     summary: Create a new tenant
 *     description: Provision a new tenant with subscription and default settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenantRequest'
 *     responses:
 *       201:
 *         description: Tenant created successfully
 */
router.post('/', superAdminAuth, validateBody(createTenantSchema), auditLogMiddleware('create', 'tenants'), async (req, res, next) => {
  try {
    const result = await tenantProvisioningService.provision({
      ...req.body,
      provisionedBy: req.user.id
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Tenant provisioned successfully',
      data: {
        tenant: result.tenant.toJSON(),
        plan: result.plan,
        tempPassword: result.tempPassword
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/tenants/:id
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}:
 *   get:
 *     tags: [Tenants]
 *     summary: Get tenant details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant details
 */
router.get('/:id', superAdminAuth, validateObjectId('id'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('businessTypeId', 'key name labels')
      .populate('provisionedBy', 'name email');

    if (!tenant) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant not found.',
        code: 'NOT_FOUND'
      });
    }

    // Get subscription info
    const subscription = await TenantSubscription.findOne({ tenantId: tenant._id })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, {
      data: {
        ...tenant.toJSON(),
        currentSubscription: subscription
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/tenants/:id
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}:
 *   patch:
 *     tags: [Tenants]
 *     summary: Update tenant
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
 *             $ref: '#/components/schemas/UpdateTenantRequest'
 *     responses:
 *       200:
 *         description: Tenant updated
 */
router.patch('/:id', superAdminAuth, validateObjectId('id'), validateBody(updateTenantSchema), auditLogMiddleware('update', 'tenants'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Tenant updated successfully',
      data: tenant
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /api/platform/tenants/:id
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}:
 *   delete:
 *     tags: [Tenants]
 *     summary: Delete a tenant
 *     description: Permanently delete a tenant and all associated data
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant deleted
 */
router.delete('/:id', superAdminAuth, validateObjectId('id'), auditLogMiddleware('delete', 'tenants'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findByIdAndDelete(req.params.id);
    if (!tenant) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant not found.',
        code: 'NOT_FOUND'
      });
    }

    // Cascade delete related data
    await Promise.all([
      TenantSubscription.deleteMany({ tenantId: tenant._id }),
      SubscriptionInvoice.deleteMany({ tenantId: tenant._id }),
      OwnerUser.deleteMany({ tenantId: tenant._id })
    ]);

    return successResponse(res, {
      message: 'Tenant and associated data deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/tenants/:id/stats
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}/stats:
 *   get:
 *     tags: [Tenants]
 *     summary: Get tenant statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant statistics
 */
router.get('/:id/stats', superAdminAuth, validateObjectId('id'), async (req, res, next) => {
  try {
    const tenantId = req.params.id;

    // Get subscription info
    const subscription = await TenantSubscription.findOne({ tenantId })
      .sort({ createdAt: -1 })
      .lean();

    // Get invoice stats
    const [totalInvoices, paidInvoices, totalRevenue] = await Promise.all([
      SubscriptionInvoice.countDocuments({ tenantId }),
      SubscriptionInvoice.countDocuments({ tenantId, paymentStatus: 'paid' }),
      SubscriptionInvoice.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    return successResponse(res, {
      data: {
        subscription,
        invoices: {
          total: totalInvoices,
          paid: paidInvoices
        },
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/tenants/:id/reset-password
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}/reset-password:
 *   post:
 *     tags: [Tenants]
 *     summary: Reset owner password
 *     description: Force-reset the owner's password and return a temporary password
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       404:
 *         description: Tenant or owner not found
 */
// ============================================================
// POST /api/platform/tenants/:id/suspend — Suspend tenant
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}/suspend:
 *   post:
 *     tags: [Tenants]
 *     summary: Suspend a tenant
 *     description: Suspends tenant portal access and subscription. Does NOT delete data.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tenant suspended
 */
router.post('/:id/suspend', superAdminAuth, validateObjectId('id'), auditLogMiddleware('suspend', 'tenants'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { portalStatus: 'suspended', isActive: false },
      { new: true }
    );

    if (!tenant) {
      return errorResponse(res, { statusCode: 404, message: 'Tenant not found.', code: 'NOT_FOUND' });
    }

    // Also suspend the subscription
    await TenantSubscription.findOneAndUpdate(
      { tenantId: tenant._id },
      {
        status: 'suspended',
        suspensionDate: new Date(),
        notes: req.body?.reason || 'Suspended by super admin'
      },
      { sort: { createdAt: -1 } }
    );

    // Deactivate all owner users for this tenant
    await OwnerUser.updateMany(
      { tenantId: tenant._id },
      { isActive: false }
    );

    await auditService.log({
      actorId: req.user.id,
      actorRole: 'super_admin',
      tenantId: tenant._id,
      action: 'tenant_suspended',
      module: 'tenants',
      targetId: tenant._id,
      targetModel: 'Tenant',
      description: `Tenant suspended: ${req.body?.reason || 'No reason provided'}`
    });

    return successResponse(res, {
      message: 'Tenant has been suspended successfully.',
      data: { tenant }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/tenants/:id/unsuspend — Unsuspend / reactivate tenant
// ============================================================

/**
 * @swagger
 * /api/platform/tenants/{id}/unsuspend:
 *   post:
 *     tags: [Tenants]
 *     summary: Reactivate a suspended tenant
 *     description: Restores tenant portal access and reactivates subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tenant reactivated
 */
router.post('/:id/unsuspend', superAdminAuth, validateObjectId('id'), auditLogMiddleware('unsuspend', 'tenants'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { portalStatus: 'active', isActive: true },
      { new: true }
    );

    if (!tenant) {
      return errorResponse(res, { statusCode: 404, message: 'Tenant not found.', code: 'NOT_FOUND' });
    }

    // Restore subscription to active
    const subscription = await TenantSubscription.findOneAndUpdate(
      { tenantId: tenant._id },
      {
        status: 'active',
        suspensionDate: null,
        $unset: { notes: '' }
      },
      { sort: { createdAt: -1 }, new: true }
    );

    // Reactivate owner users
    await OwnerUser.updateMany(
      { tenantId: tenant._id },
      { isActive: true }
    );

    await auditService.log({
      actorId: req.user.id,
      actorRole: 'super_admin',
      tenantId: tenant._id,
      action: 'tenant_unsuspended',
      module: 'tenants',
      targetId: tenant._id,
      targetModel: 'Tenant',
      description: 'Tenant reactivated from suspension'
    });

    return successResponse(res, {
      message: 'Tenant has been reactivated successfully.',
      data: { tenant, subscription }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/tenants/:id/reset-password
// ============================================================

router.post('/:id/reset-password', superAdminAuth, validateObjectId('id'), auditLogMiddleware('reset-password', 'tenants'), async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant not found.',
        code: 'NOT_FOUND'
      });
    }

    // Find the owner user for this tenant
    const owner = await OwnerUser.findOne({ tenantId: tenant._id, role: 'owner_admin' });
    if (!owner) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Owner user not found for this tenant.',
        code: 'OWNER_NOT_FOUND'
      });
    }

    // Generate new temporary password
    const tempPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Update owner password and force first-login
    owner.passwordHash = passwordHash;
    owner.firstLogin = true;
    await owner.save();

    // Audit log
    await auditService.log({
      actorId: req.user.id,
      actorRole: 'super_admin',
      tenantId: tenant._id,
      action: 'owner_password_reset',
      module: 'tenants',
      targetId: owner._id,
      targetModel: 'OwnerUser',
      description: `Owner password reset for tenant '${tenant.businessName}' (${tenant.tenantCode})`
    });

    return successResponse(res, {
      message: 'Owner password has been reset successfully.',
      data: {
        tempPassword,
        ownerEmail: owner.email,
        ownerName: owner.name
      }
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
