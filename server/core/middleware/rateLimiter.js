import rateLimit from 'express-rate-limit';
import { SYSTEM_CONFIG } from '../config/constants.js';

// ============================================================
// GENERAL API RATE LIMITER
// ============================================================
// 100 requests per minute per IP

export const generalLimiter = rateLimit({
  windowMs: SYSTEM_CONFIG.RATE_LIMIT_GENERAL.windowMs,
  max: SYSTEM_CONFIG.RATE_LIMIT_GENERAL.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

// ============================================================
// AUTH ENDPOINT RATE LIMITER
// ============================================================
// 5 attempts per 15 minutes per IP

export const authLimiter = rateLimit({
  windowMs: SYSTEM_CONFIG.RATE_LIMIT_AUTH.windowMs,
  max: SYSTEM_CONFIG.RATE_LIMIT_AUTH.max,
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts, please try again after 15 minutes'
    }
  }
});

// ============================================================
// API KEY RATE LIMITER (for future public API)
// ============================================================
// Higher limits for API key holders

export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'API rate limit exceeded'
    }
  }
});

// ============================================================
// SIGNUP RATE LIMITER
// ============================================================
// 3 signups per hour per IP

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many signup attempts, please try again after an hour'
    }
  }
});

