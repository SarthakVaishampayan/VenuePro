import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// ============================================================
// TOKEN GENERATION
// ============================================================

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
};

// Generate both tokens with rotation support
export const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRY
  };
};

// ============================================================
// TOKEN VERIFICATION
// ============================================================

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
};

// ============================================================
// TOKEN DECODE (without verification)
// ============================================================

export const decodeToken = (token) => {
  return jwt.decode(token);
};

// ============================================================
// COOKIE OPTIONS
// ============================================================

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh'
});

// ============================================================
// PAYLOAD HELPERS
// ============================================================

export const createSuperAdminPayload = (admin) => ({
  id: admin._id.toString(),
  email: admin.email,
  role: 'super_admin'
});

export const createOwnerPayload = (owner, tenant) => ({
  id: owner._id.toString(),
  tenantId: owner.tenantId.toString(),
  businessType: tenant.businessTypeId?.key || 'pool_snooker',
  role: 'owner_admin'
});

export const createStaffPayload = (staff) => ({
  id: staff._id.toString(),
  tenantId: staff.tenantId.toString(),
  branchId: staff.branchId?.toString(),
  role: staff.role,
  permissions: staff.permissions
});

// ============================================================
// TOKEN BLACKLIST (for logout)
// ============================================================

// Simple in-memory blacklist. Use Redis for production.
const tokenBlacklist = new Set();

export const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  // Auto-expire after token lifetime
  setTimeout(() => tokenBlacklist.delete(token), 7 * 24 * 60 * 60 * 1000);
};

export const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// ============================================================
// REFRESH TOKEN ROTATION
// ============================================================

// Store used refresh tokens to detect reuse (indicating theft)
const usedRefreshTokens = new Set();

export const rotateRefreshToken = (oldToken, payload) => {
  // Check if this token was already used (potential theft)
  if (usedRefreshTokens.has(oldToken)) {
    logger.warn('Refresh token reuse detected — possible token theft', {
      userId: payload.id
    });
    return null; // Signal theft — force re-login
  }
  
  // Mark old token as used
  usedRefreshTokens.add(oldToken);
  
  // Issue new token pair
  const newTokens = generateTokenPair(payload);
  
  // Auto-cleanup
  setTimeout(() => usedRefreshTokens.delete(oldToken), 7 * 24 * 60 * 60 * 1000);
  
  return newTokens;
};

