import express from 'express';
import { z } from 'zod';
import { generateTokenPair, verifyRefreshToken, blacklistToken, rotateRefreshToken, createSuperAdminPayload, getRefreshCookieOptions } from '../utils/jwtHelper.js';
import { validateBody } from '../middleware/validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { superAdminAuth } from '../middleware/auth.js';
import { error as errorResponse, success as successResponse } from '../utils/responseHelper.js';
import SuperAdmin from '../models/SuperAdmin.js';
import passwordService from '../services/passwordService.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required')
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
});

// ============================================================
// POST /api/platform/auth/login
// ============================================================

/**
 * @swagger
 * /api/platform/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Super admin login
 *     description: Authenticate a super admin and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find admin (include password hash)
    const admin = await SuperAdmin.findOne({ email }).select('+passwordHash');
    
    if (!admin) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Account has been deactivated. Contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Check if account is locked
    if (admin.isLocked()) {
      return errorResponse(res, {
        statusCode: 423,
        message: 'Account is temporarily locked due to multiple failed attempts. Try again after 15 minutes.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await admin.incrementFailedLogins();
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Reset failed login counter
    await admin.resetFailedLogins();

    // Generate tokens
    const payload = createSuperAdminPayload(admin);
    const tokens = generateTokenPair(payload);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, getRefreshCookieOptions());

    return successResponse(res, {
      message: 'Login successful',
      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        tokens
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/auth/refresh
// ============================================================

/**
 * @swagger
 * /api/platform/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Get a new access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', validateBody(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return errorResponse(res, {
        statusCode: 401,
        message: err.message === 'Refresh token expired'
          ? 'Session expired. Please login again.'
          : 'Invalid refresh token.',
        code: err.message === 'Refresh token expired' ? 'REFRESH_EXPIRED' : 'INVALID_REFRESH_TOKEN'
      });
    }

    // Rotate the refresh token (detects theft)
    const newTokens = rotateRefreshToken(refreshToken, {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    });

    if (!newTokens) {
      // Token reuse detected — force re-login
      return errorResponse(res, {
        statusCode: 401,
        message: 'Session compromised. Please login again.',
        code: 'TOKEN_THEFT_DETECTED'
      });
    }

    // Update cookie
    res.cookie('refreshToken', newTokens.refreshToken, getRefreshCookieOptions());

    return successResponse(res, {
      message: 'Token refreshed successfully',
      data: { tokens: newTokens }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/auth/logout
// ============================================================

/**
 * @swagger
 * /api/platform/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     description: Invalidate current access token
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', superAdminAuth, async (req, res, next) => {
  try {
    // Get token from request
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      blacklistToken(authHeader.split(' ')[1]);
    }

    // Clear refresh cookie
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    return successResponse(res, {
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/auth/forgot-password
// ============================================================

/**
 * @swagger
 * /api/platform/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Forgot password
 *     description: Request a password reset link via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent (or always returns success to prevent enumeration)
 */
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const result = await passwordService.superAdminForgotPassword(req.body.email);

    return successResponse(res, {
      message: result.message,
      data: result.resetToken ? { resetToken: result.resetToken } : undefined
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/auth/reset-password/:token
// ============================================================

/**
 * @swagger
 * /api/platform/auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     description: Reset password using a valid reset token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Reset token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password/:token', authLimiter, validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const result = await passwordService.superAdminResetPassword(
      req.params.token,
      req.body.password
    );

    if (!result.success) {
      return errorResponse(res, {
        statusCode: 400,
        message: result.message,
        code: result.code || 'RESET_FAILED'
      });
    }

    return successResponse(res, {
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/auth/me
// ============================================================

/**
 * @swagger
 * /api/platform/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     description: Get the currently authenticated user's profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Not authenticated
 */
router.get('/me', superAdminAuth, async (req, res, next) => {
  try {
    const admin = await SuperAdmin.findById(req.user.id).select('-__v');
    if (!admin) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Admin not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      data: admin
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
