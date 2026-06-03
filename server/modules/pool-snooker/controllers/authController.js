import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import OwnerUser from '../models/OwnerUser.js';
import StaffUser from '../models/StaffUser.js';
import Tenant from '../../../core/models/Tenant.js';
import TenantSetting from '../models/TenantSetting.js';
import { SYSTEM_CONFIG } from '../../../core/config/constants.js';
import { success, error, created } from '../../../core/utils/responseHelper.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../core/utils/jwtHelper.js';

const generateTokens = (user, businessType = 'pool_snooker') => {
  const payload = {
    id: user._id.toString(),
    tenantId: user.tenantId.toString(),
    role: user.role,
    name: user.name,
    businessType
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { accessToken, refreshToken };
};

/**
 * @swagger
 * /api/tenant/auth/login:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Owner login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, { statusCode: 400, message: 'Email and password are required', code: 'MISSING_FIELDS' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const owner = await OwnerUser.findOne({ email: normalizedEmail, isActive: true });
    if (!owner) {
      return error(res, { statusCode: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Check if account is temporarily locked due to too many failed attempts
    if (owner.lockedUntil && owner.lockedUntil > new Date()) {
      const remainingMs = owner.lockedUntil - new Date();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      const timeMsg = remainingMinutes >= 1
        ? `Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`
        : 'Please try again in less than a minute.';
      return error(res, {
        statusCode: 423,
        message: `Account is temporarily locked due to multiple failed login attempts. ${timeMsg}`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Reset lockout if lockout period has expired
    if (owner.lockedUntil && owner.lockedUntil <= new Date()) {
      owner.failedLoginAttempts = 0;
      owner.lockedUntil = null;
    }

    const isMatch = await bcrypt.compare(password, owner.passwordHash);
    if (!isMatch) {
      // Increment failed attempts
      owner.failedLoginAttempts = (owner.failedLoginAttempts || 0) + 1;

      // Lock account if threshold exceeded
      if (owner.failedLoginAttempts >= SYSTEM_CONFIG.ACCOUNT_LOCKOUT_THRESHOLD) {
        owner.lockedUntil = new Date(Date.now() + SYSTEM_CONFIG.ACCOUNT_LOCKOUT_DURATION);
      }

      await owner.save();
      return error(res, { statusCode: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Successful login — reset failed attempts counter
    owner.failedLoginAttempts = 0;
    owner.lockedUntil = null;

    // Fetch tenant to check status and get business type info
    const tenant = await Tenant.findById(owner.tenantId).populate('businessTypeId');
    if (!tenant) {
      return error(res, { statusCode: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }
    if (!tenant.isActive || tenant.portalStatus !== 'active') {
      return error(res, { statusCode: 403, message: 'Tenant access has been suspended. Please contact support.', code: 'TENANT_SUSPENDED' });
    }
    const businessType = tenant?.businessTypeId?.key || 'pool_snooker';
    const businessName = tenant?.businessName || '';
    const isDemo = tenant?.isDemo || false;

    const isFirstLogin = owner.firstLogin;
    if (owner.firstLogin) {
      owner.firstLogin = false;
    }
    owner.lastLoginAt = new Date();
    await owner.save();

    const tokens = generateTokens(owner, businessType);

    return success(res, {
      data: {
        ...tokens,
        user: {
          id: owner._id,
          name: owner.name,
          email: owner.email,
          role: owner.role,
          tenantId: owner.tenantId,
          firstLogin: isFirstLogin,
          businessType,
          businessName,
          isDemo
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/auth/staff-login:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Staff login
 */
export const staffLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return error(res, { statusCode: 400, message: 'Phone and password are required', code: 'MISSING_FIELDS' });
    }

    const staff = await StaffUser.findOne({ phone, isActive: true });
    if (!staff) {
      return error(res, { statusCode: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (!staff.hasPortalAccess) {
      return error(res, { statusCode: 403, message: 'Portal access not granted', code: 'PORTAL_ACCESS_DENIED' });
    }

    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      return error(res, { statusCode: 401, message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const payload = {
      id: staff._id.toString(),
      tenantId: staff.tenantId.toString(),
      branchId: staff.branchId?.toString(),
      role: staff.role,
      name: staff.name,
      permissions: staff.permissions
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return success(res, {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: staff._id,
          name: staff.name,
          role: staff.role,
          permissions: staff.permissions,
          tenantId: staff.tenantId
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/auth/refresh:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Refresh access token
 */
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, { statusCode: 400, message: 'Refresh token is required', code: 'MISSING_TOKEN' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    let user;
    if (decoded.role === 'owner_admin') {
      user = await OwnerUser.findById(decoded.id).select('-passwordHash');
    } else {
      user = await StaffUser.findById(decoded.id);
    }

    if (!user || !user.isActive) {
      return error(res, { statusCode: 401, message: 'User not found or inactive', code: 'USER_INACTIVE' });
    }

    const tokens = generateTokens(decoded.role === 'owner_admin'
      ? { _id: user._id, tenantId: user.tenantId, role: user.role, name: user.name }
      : { _id: user._id, tenantId: user.tenantId, role: user.role, name: user.name }
    );

    return success(res, { data: tokens });
  } catch (err) {
    if (err.message === 'Refresh token expired') {
      return error(res, { statusCode: 401, message: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
    }
    return error(res, { statusCode: 401, message: 'Invalid refresh token', code: 'INVALID_TOKEN' });
  }
};

/**
 * @swagger
 * /api/tenant/auth/change-password:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Change password (logged in user)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, { statusCode: 400, message: 'Current password and new password are required', code: 'MISSING_FIELDS' });
    }

    if (newPassword.length < 8) {
      return error(res, { statusCode: 400, message: 'New password must be at least 8 characters', code: 'WEAK_PASSWORD' });
    }

    if (currentPassword === newPassword) {
      return error(res, { statusCode: 400, message: 'New password must be different from current password', code: 'SAME_PASSWORD' });
    }

    const owner = await OwnerUser.findById(req.user.id);
    if (!owner) {
      return error(res, { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const isMatch = await bcrypt.compare(currentPassword, owner.passwordHash);
    if (!isMatch) {
      return error(res, { statusCode: 400, message: 'Current password is incorrect', code: 'INVALID_PASSWORD' });
    }

    const salt = await bcrypt.genSalt(12);
    owner.passwordHash = await bcrypt.hash(newPassword, salt);
    await owner.save();

    return success(res, { message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/auth/logout:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Logout
 */
export const logout = async (req, res) => {
  return success(res, { message: 'Logged out successfully' });
};

/**
 * @swagger
 * /api/tenant/auth/me:
 *   get:
 *     tags: [Tenant Auth]
 *     summary: Get current user
 */
export const getMe = async (req, res, next) => {
  try {
    let user;
    let businessType = 'pool_snooker';
    let businessName = '';
    let isDemo = false;

    if (req.user.role === 'owner_admin') {
      user = await OwnerUser.findById(req.user.id).select('-passwordHash');
      if (user) {
        const tenant = await Tenant.findById(user.tenantId).populate('businessTypeId');
        businessType = tenant?.businessTypeId?.key || 'pool_snooker';
        businessName = tenant?.businessName || '';
        isDemo = tenant?.isDemo || false;
      }
    } else {
      user = await StaffUser.findById(req.user.id);
    }

    if (!user) {
      return error(res, { statusCode: 404, message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const userObj = user.toObject ? user.toObject() : { ...user._doc };
    userObj.businessType = businessType;
    userObj.businessName = businessName;
    userObj.isDemo = isDemo;

    return success(res, { data: userObj });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/auth/forgot-password:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Request password reset
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return error(res, { statusCode: 400, message: 'Email is required', code: 'MISSING_FIELDS' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const owner = await OwnerUser.findOne({ email: normalizedEmail });
    if (!owner) {
      // Don't reveal if email exists
      return success(res, { message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    owner.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    owner.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await owner.save();

    // In production, send email with reset link
    // For now, return the token (dev mode)
    return success(res, {
      message: 'If an account with that email exists, a reset link has been sent.',
      data: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/auth/reset-password/:token:
 *   post:
 *     tags: [Tenant Auth]
 *     summary: Reset password with token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return error(res, { statusCode: 400, message: 'Token and password are required', code: 'MISSING_FIELDS' });
    }

    if (password.length < 8) {
      return error(res, { statusCode: 400, message: 'Password must be at least 8 characters', code: 'WEAK_PASSWORD' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const owner = await OwnerUser.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!owner) {
      return error(res, { statusCode: 400, message: 'Invalid or expired reset token', code: 'INVALID_TOKEN' });
    }

    // Update password
    const salt = await bcrypt.genSalt(12);
    owner.passwordHash = await bcrypt.hash(password, salt);
    owner.resetPasswordToken = undefined;
    owner.resetPasswordExpires = undefined;
    await owner.save();

    return success(res, { message: 'Password reset successful. You can now login with your new password.' });
  } catch (err) {
    next(err);
  }
};
