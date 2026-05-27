// ============================================================
// PASSWORD SERVICE
// ============================================================
// Forgot password & account recovery

import crypto from 'crypto';
import SuperAdmin from '../models/SuperAdmin.js';
import Tenant from '../models/Tenant.js';
import { hashPassword } from '../utils/passwordHelper.js';
import auditService from './auditService.js';
import { logger } from '../config/logger.js';

class PasswordService {
  constructor() {
    // In-memory token store for development. Use Redis for production.
    this.resetTokens = new Map();
    // Token expiry: 1 hour
    this.TOKEN_EXPIRY_MS = 60 * 60 * 1000;
  }

  /**
   * Generate a reset token (without needing MongoDB to change)
   * @param {string} identifier - email or user ID
   * @returns {string} Reset token
   */
  _generateToken(identifier) {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetTokens.set(token, {
      identifier,
      expiresAt: Date.now() + this.TOKEN_EXPIRY_MS,
      used: false
    });

    // Auto-cleanup after expiry
    setTimeout(() => {
      this.resetTokens.delete(token);
    }, this.TOKEN_EXPIRY_MS + 1000);

    return token;
  }

  /**
   * Verify a reset token
   * @param {string} token
   * @returns {Object|null} { identifier } or null if invalid
   */
  _verifyToken(token) {
    const data = this.resetTokens.get(token);
    if (!data) return null;
    if (data.used) return null;
    if (Date.now() > data.expiresAt) {
      this.resetTokens.delete(token);
      return null;
    }
    return { identifier: data.identifier };
  }

  /**
   * Mark token as used
   * @param {string} token
   */
  _markTokenUsed(token) {
    const data = this.resetTokens.get(token);
    if (data) {
      data.used = true;
    }
  }

  // ============================================================
  // SUPER ADMIN PASSWORD FLOW
  // ============================================================

  /**
   * Initiate forgot password for super admin
   * @param {string} email
   * @returns {Promise<{success: boolean, message: string, resetToken?: string}>}
   */
  async superAdminForgotPassword(email) {
    const admin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });

    // Don't reveal if email exists
    if (!admin) {
      return { success: true, message: 'If an account with that email exists, a reset link has been generated.' };
    }

    const resetToken = this._generateToken(admin._id.toString());

    // In production, send email here
    logger.info(`Password reset requested for super admin: ${email}`);
    logger.info(`Reset token: ${resetToken}`); // In dev, log the token

    await auditService.log({
      actorId: admin._id,
      actorRole: 'super_admin',
      action: 'password_reset',
      module: 'auth',
      targetId: admin._id,
      targetModel: 'SuperAdmin',
      description: `Password reset requested for ${email}`
    });

    return {
      success: true,
      message: 'If an account with that email exists, a reset link has been generated.',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    };
  }

  /**
   * Reset password for super admin
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async superAdminResetPassword(token, newPassword) {
    const tokenData = this._verifyToken(token);
    if (!tokenData) {
      return { success: false, message: 'Invalid or expired reset token.', code: 'INVALID_TOKEN' };
    }

    const admin = await SuperAdmin.findById(tokenData.identifier).select('+passwordHash');
    if (!admin) {
      return { success: false, message: 'Admin not found.', code: 'NOT_FOUND' };
    }

    admin.passwordHash = newPassword;
    admin.passwordChangedAt = new Date();
    await admin.save();

    this._markTokenUsed(token);

    await auditService.log({
      actorId: admin._id,
      actorRole: 'super_admin',
      action: 'password_change',
      module: 'auth',
      targetId: admin._id,
      targetModel: 'SuperAdmin',
      description: 'Password reset completed via forgot password flow'
    });

    logger.info(`Password reset completed for super admin: ${admin.email}`);

    return { success: true, message: 'Password has been reset successfully. You can now login with your new password.' };
  }

  // ============================================================
  // TENANT OWNER PASSWORD FLOW
  // ============================================================

  /**
   * Initiate forgot password for tenant owner
   * @param {string} email - Owner email
   * @returns {Promise<Object>}
   */
  async tenantOwnerForgotPassword(email) {
    const tenant = await Tenant.findOne({ ownerEmail: email.toLowerCase().trim() });

    if (!tenant) {
      return { success: true, message: 'If an account with that email exists, a reset link has been generated.' };
    }

    const resetToken = this._generateToken(tenant._id.toString());

    logger.info(`Password reset requested for tenant owner: ${email} (tenant: ${tenant.businessName})`);
    logger.info(`Reset token: ${resetToken}`);

    await auditService.log({
      actorId: tenant._id,
      actorRole: 'owner_admin',
      tenantId: tenant._id,
      action: 'password_reset',
      module: 'auth',
      targetId: tenant._id,
      targetModel: 'Tenant',
      description: `Password reset requested for owner email ${email}`
    });

    return {
      success: true,
      message: 'If an account with that email exists, a reset link has been generated.',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    };
  }

  /**
   * Reset password for tenant owner
   * @param {string} token
   * @param {string} newPassword
   * @returns {Promise<Object>}
   */
  async tenantOwnerResetPassword(token, newPassword) {
    const tokenData = this._verifyToken(token);
    if (!tokenData) {
      return { success: false, message: 'Invalid or expired reset token.', code: 'INVALID_TOKEN' };
    }

    const tenant = await Tenant.findById(tokenData.identifier);
    if (!tenant) {
      return { success: false, message: 'Tenant not found.', code: 'NOT_FOUND' };
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);
    
    // Update owner password
    tenant.ownerPasswordHash = passwordHash;
    tenant.passwordChangedAt = new Date();
    await tenant.save();

    this._markTokenUsed(token);

    await auditService.log({
      actorId: tenant._id,
      actorRole: 'owner_admin',
      tenantId: tenant._id,
      action: 'password_change',
      module: 'auth',
      targetId: tenant._id,
      targetModel: 'Tenant',
      description: 'Password reset completed via forgot password flow'
    });

    return { success: true, message: 'Password has been reset successfully. You can now login with your new password.' };
  }
}

export default new PasswordService();
