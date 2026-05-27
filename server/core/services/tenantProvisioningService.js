// ============================================================
// TENANT PROVISIONING SERVICE
// ============================================================
// Handles automated tenant creation with default data

import Tenant from '../models/Tenant.js';
import TenantSubscription from '../models/TenantSubscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import OwnerUser from '../../modules/pool-snooker/models/OwnerUser.js';
import { hashPassword, generateTemporaryPassword } from '../utils/passwordHelper.js';
import { logger } from '../config/logger.js';
import auditService from './auditService.js';

class TenantProvisioningService {
  /**
   * Provision a new tenant with defaults
   * @param {Object} data
   * @param {string} data.businessName
   * @param {string} data.businessTypeId
   * @param {string} data.ownerName
   * @param {string} data.ownerEmail
   * @param {string} data.ownerPhone
   * @param {Object} [data.address]
   * @param {string} [data.timezone]
   * @param {string} [data.currency]
   * @param {string} [data.planKey] - 'free' | 'starter' | 'professional' | 'enterprise'
   * @param {string} [data.billingCycle] - 'monthly' | 'quarterly' | 'yearly'
   * @param {number} [data.trialDays]
   * @param {boolean} [data.isDemo]
   * @param {string} [data.provisionedBy] - SuperAdmin ID
   * @returns {Promise<Object>} { tenant, subscription, tempPassword }
   */
  async provision(data) {
    // 1. Resolve plan
    const planKey = data.planKey || 'free';
    const plan = await SubscriptionPlan.findByKey(planKey);
    if (!plan) {
      throw new Error(`Subscription plan '${planKey}' not found or inactive`);
    }

    // 2. Generate password
    // If passwordOverride provided (self-service signup), use that; otherwise generate temp password
    const tempPassword = data.passwordOverride || generateTemporaryPassword();
    const passwordHash = await hashPassword(tempPassword);

    // 3. Create tenant
    const tenant = await Tenant.create({
      businessName: data.businessName,
      businessTypeId: data.businessTypeId,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone,
      address: data.address || {},
      timezone: data.timezone || 'Asia/Kolkata',
      currency: data.currency || 'INR',
      maxBranches: plan.limits.branches || 1,
      maxResources: plan.limits.resources || 5,
      maxStaff: plan.limits.staff || 2,
      isDemo: data.isDemo || false,
      demoExpiresAt: data.isDemo ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
      provisionedAt: new Date(),
      provisionedBy: data.provisionedBy || null,
      tenantCode: data.tenantCode || null
    });

    // 4. Create subscription
    const trialDays = data.trialDays || plan.trialDays;
    const billingCycle = data.billingCycle || 'monthly';
    const price = plan.prices[billingCycle] || plan.prices.monthly;

    const subscription = await TenantSubscription.create({
      tenantId: tenant._id,
      planId: plan._id,
      planSnapshot: {
        name: plan.name,
        key: plan.key,
        prices: plan.prices,
        limits: plan.limits
      },
      billingCycle,
      amount: price,
      status: trialDays > 0 ? 'trialing' : 'active',
      trialStartDate: trialDays > 0 ? new Date() : null,
      trialEndDate: trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      gracePeriodDays: 7,
      gracePeriodEnd: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000)
    });

    // 5. Create owner user account
    await OwnerUser.create({
      tenantId: tenant._id,
      name: data.ownerName,
      email: data.ownerEmail,
      phone: data.ownerPhone,
      passwordHash,
      role: 'owner_admin',
      isActive: true,
      firstLogin: true
    });

    // 6. Default settings will be created here in Phase 3
    // when tenant-level models (Setting, etc.) are added to the module.
    // These include: rounding rules, operating hours, branding, etc.

    // 7. Audit log
    await auditService.log({
      actorId: data.provisionedBy || 'system',
      actorRole: data.provisionedBy ? 'super_admin' : 'system',
      actorName: data.provisionedBy ? 'Super Admin' : 'System',
      tenantId: tenant._id,
      action: 'tenant_provisioned',
      module: 'tenants',
      targetId: tenant._id,
      targetModel: 'Tenant',
      description: `Tenant '${data.businessName}' provisioned with ${plan.name} plan (${billingCycle})`
    });

    logger.info(`Tenant provisioned: ${tenant.businessName} (${tenant.tenantCode})`);

    return {
      tenant,
      subscription,
      tempPassword,
      plan: plan.toJSON()
    };
  }

  /**
   * Create a demo tenant (auto-expiring)
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createDemo(data) {
    return this.provision({
      ...data,
      planKey: 'free',
      isDemo: true,
      trialDays: 0
    });
  }

  /**
   * Suspend a tenant
   * @param {string} tenantId
   * @param {string} reason
   * @param {string} suspendedBy - SuperAdmin ID
   * @returns {Promise<Object>}
   */
  async suspendTenant(tenantId, reason, suspendedBy) {
    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { portalStatus: 'suspended' },
      { new: true }
    );

    await TenantSubscription.findOneAndUpdate(
      { tenantId },
      { status: 'suspended', suspensionDate: new Date(), notes: reason },
      { new: true }
    );

    await auditService.log({
      actorId: suspendedBy,
      actorRole: 'super_admin',
      tenantId,
      action: 'tenant_suspended',
      module: 'tenants',
      targetId: tenantId,
      targetModel: 'Tenant',
      description: `Tenant suspended: ${reason}`
    });

    return tenant;
  }
}

export default new TenantProvisioningService();
