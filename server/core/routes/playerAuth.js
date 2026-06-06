// ============================================================
// PLAYER AUTH ROUTES — Player Portal Signup & Login
// ============================================================
// Allows players to self-register and login to their portal.

import express from 'express';
import { z } from 'zod';
import { hashPassword } from '../utils/passwordHelper.js';
import crypto from 'crypto';
import { validateBody } from '../middleware/validator.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { playerAuth } from '../middleware/playerAuth.js';
import { error as errorResponse, success as successResponse } from '../utils/responseHelper.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwtHelper.js';
import Player from '../models/Player.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';

const router = express.Router();

// ============================================================
// Helpers
// ============================================================

const generateTokens = (player) => {
  const payload = {
    id: player._id.toString(),
    email: player.email,
    phone: player.phone,
    role: 'player',
    name: player.fullName
  };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

// ============================================================
// Schemas
// ============================================================

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format').toLowerCase().trim().optional().or(z.literal('')),
  phone: z.string().min(10, 'Valid phone number required').max(20).optional().or(z.literal('')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  nickname: z.string().max(50).optional()
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
  path: ['email']
});

const loginSchema = z.object({
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(1, 'Password is required')
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone is required',
  path: ['email']
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  nickname: z.string().max(50).optional(),
  phone: z.string().min(10).max(20).optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      sms: z.boolean().optional()
    }).optional(),
    timezone: z.string().optional()
  }).optional()
});

// ============================================================
// POST /api/player/auth/signup
// ============================================================

/**
 * @swagger
 * /api/player/auth/signup:
 *   post:
 *     tags: [Player Auth]
 *     summary: Player self-registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, password]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               nickname: { type: string }
 *     responses:
 *       201:
 *         description: Player created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or phone already registered
 */
router.post('/signup', authLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    const { fullName, email, phone, password, nickname } = req.body;

    // Check for existing player with same email or phone
    const existingQuery = [];
    if (email) existingQuery.push({ email });
    if (phone) existingQuery.push({ phone });

    if (existingQuery.length > 0) {
      const existing = await Player.findOne({ $or: existingQuery });
      if (existing) {
        const field = email && existing.email === email ? 'Email' : 'Phone';
        return errorResponse(res, {
          statusCode: 409,
          message: `${field} is already registered. Please login instead.`,
          code: 'DUPLICATE_PLAYER'
        });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create player
    const player = await Player.create({
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      nickname: nickname || undefined,
      passwordHash
    });

    // Generate tokens
    const tokens = generateTokens(player);

    return successResponse(res, {
      statusCode: 201,
      message: 'Account created successfully!',
      data: {
        ...tokens,
        user: {
          id: player._id,
          fullName: player.fullName,
          email: player.email,
          phone: player.phone,
          nickname: player.nickname
        }
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return errorResponse(res, {
        statusCode: 409,
        message: `This ${field} is already registered. Please login instead.`,
        code: 'DUPLICATE_PLAYER'
      });
    }
    next(err);
  }
});

// ============================================================
// POST /api/player/auth/login
// ============================================================

/**
 * @swagger
 * /api/player/auth/login:
 *   post:
 *     tags: [Player Auth]
 *     summary: Player login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Find player by email or phone
    const query = [];
    if (email) query.push({ email });
    if (phone) query.push({ phone });

    const player = await Player.findOne({ $or: query, isActive: true });
    if (!player) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid credentials.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const isMatch = await player.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid credentials.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    player.lastLoginAt = new Date();
    await player.save();

    const tokens = generateTokens(player);

    return successResponse(res, {
      data: {
        ...tokens,
        passwordChangeRequired: player.passwordChangeRequired || false,
        user: {
          id: player._id,
          fullName: player.fullName,
          email: player.email,
          phone: player.phone,
          nickname: player.nickname,
          linkedTenants: player.linkedTenants,
          passwordChangeRequired: player.passwordChangeRequired || false
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/player/auth/refresh
// ============================================================

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Refresh token is required.',
        code: 'MISSING_TOKEN'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (decoded.role !== 'player') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    const player = await Player.findById(decoded.id);
    if (!player || !player.isActive) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Account not found or inactive.',
        code: 'USER_INACTIVE'
      });
    }

    const tokens = generateTokens(player);
    return successResponse(res, { data: tokens });
  } catch (err) {
    if (err.message === 'Refresh token expired') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return errorResponse(res, {
      statusCode: 401,
      message: 'Invalid refresh token.',
      code: 'INVALID_TOKEN'
    });
  }
});

// ============================================================
// GET /api/player/auth/me
// ============================================================

/**
 * @swagger
 * /api/player/auth/me:
 *   get:
 *     tags: [Player Auth]
 *     summary: Get current player profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Player profile
 */
router.get('/me', playerAuth, async (req, res, next) => {
  try {
    const player = await Player.findById(req.playerId)
      .populate('linkedTenants.tenantId', 'businessName businessTypeId tenantCode')
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires');

    if (!player) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Player not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, { data: player });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/player/auth/profile
// ============================================================

router.patch('/profile', playerAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.fullName) updates.fullName = req.body.fullName;
    if (req.body.nickname !== undefined) updates.nickname = req.body.nickname;
    if (req.body.phone) updates.phone = req.body.phone;
    if (req.body.preferences) updates.preferences = { ...req.body.preferences };

    const player = await Player.findByIdAndUpdate(
      req.playerId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!player) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Player not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Profile updated successfully',
      data: player
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PUT /api/player/auth/change-password
// ============================================================

/**
 * @swagger
 * /api/player/auth/change-password:
 *   put:
 *     tags: [Player Auth]
 *     summary: Change password (logged in player)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/change-password', playerAuth, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'New password must be different from current password.',
        code: 'SAME_PASSWORD'
      });
    }

    const player = await Player.findById(req.playerId);
    if (!player) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Player not found.',
        code: 'NOT_FOUND'
      });
    }

    // Verify current password
    const isMatch = await player.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Current password is incorrect.',
        code: 'INVALID_PASSWORD'
      });
    }

    // Hash and save new password
    player.passwordHash = await hashPassword(newPassword);
    player.passwordChangeRequired = false;
    await player.save();

    return successResponse(res, { message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/player/auth/logout
// ============================================================

router.post('/logout', playerAuth, async (req, res) => {
  return successResponse(res, { message: 'Logged out successfully' });
});

// ============================================================
// POST /api/player/auth/forgot-password
// ============================================================

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Email is required.',
        code: 'MISSING_FIELDS'
      });
    }

    const player = await Player.findOne({ email: email.toLowerCase().trim() });
    if (!player) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'No account connected to this email id',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    player.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    player.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await player.save();

    // Build the reset link
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetLink = `${appUrl}/play/reset-password/${resetToken}`;

    // Send password reset email via event bus (subscribers.js handles the email dispatch)
    eventBus.emit(EVENT_TYPES.PASSWORD_RESET, {
      email: player.email,
      name: player.fullName,
      resetLink
    });

    return successResponse(res, {
      message: 'Reset link has been sent to your email. Please check your inbox.',
      data: process.env.NODE_ENV === 'development' ? { resetToken } : undefined
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/player/auth/reset-password/:token
// ============================================================

router.post('/reset-password/:token', authLimiter, async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Token and password are required.',
        code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 8) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Password must be at least 8 characters.',
        code: 'WEAK_PASSWORD'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const player = await Player.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!player) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid or expired reset token.',
        code: 'INVALID_TOKEN'
      });
    }

    player.passwordHash = await hashPassword(password);
    player.resetPasswordToken = undefined;
    player.resetPasswordExpires = undefined;
    await player.save();

    return successResponse(res, {
      message: 'Password reset successful. You can now login.'
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
