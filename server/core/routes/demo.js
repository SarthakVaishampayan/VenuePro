// ============================================================
// DEMO ROUTES — Try Demo & Reset Demo
// ============================================================

import express from 'express';
import BusinessType from '../models/BusinessType.js';
import Tenant from '../models/Tenant.js';
import tenantProvisioningService from '../services/tenantProvisioningService.js';
import { seedDemoData, clearDemoData } from '../services/demoSeedService.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtHelper.js';
import { success, error } from '../utils/responseHelper.js';
import { logger } from '../config/logger.js';
import mongoose from 'mongoose';

const router = express.Router();

// Track demo start attempts per IP (simple in-memory, resets on server restart)
const demoStartTracker = new Map();

// Rate limit: max 3 demo starts per IP per hour
function checkDemoRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxAttempts = 3;

  if (!demoStartTracker.has(ip)) {
    demoStartTracker.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  const entry = demoStartTracker.get(ip);
  if (now - entry.firstAttempt > windowMs) {
    // Reset window
    demoStartTracker.set(ip, { count: 1, firstAttempt: now });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================================
// POST /api/public/demo/start — Create a demo tenant
// ============================================================

router.post('/start', async (req, res, next) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Rate limit check
    if (!checkDemoRateLimit(ip)) {
      return error(res, {
        statusCode: 429,
        message: 'Too many demo requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    const { businessTypeKey } = req.body;

    if (!businessTypeKey) {
      return error(res, {
        statusCode: 400,
        message: 'Business type key is required.',
        code: 'MISSING_FIELDS',
      });
    }

    // Validate business type
    const businessType = await BusinessType.findOne({ key: businessTypeKey, status: 'active' });
    if (!businessType) {
      return error(res, {
        statusCode: 400,
        message: `Business type '${businessTypeKey}' is not available.`,
        code: 'INVALID_BUSINESS_TYPE',
      });
    }

    // Generate unique demo name + email
    const suffix = Math.random().toString(36).substring(2, 8);
    const demoEmail = `demo-${suffix}@venuepro.demo`;
    const demoPassword = 'Demo@12345';

    // Provision demo tenant
    const result = await tenantProvisioningService.createDemo({
      businessName: `Demo ${businessType.name}`,
      businessTypeId: businessType._id,
      ownerName: 'Demo User',
      ownerEmail: demoEmail,
      ownerPhone: `99999${suffix.substring(0, 5)}`,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    });

    // Seed demo data
    await seedDemoData(result.tenant._id, businessTypeKey);

    // Auto-login: generate tokens
    const OwnerUser = mongoose.model('OwnerUser');
    const owner = await OwnerUser.findOne({ email: demoEmail });

    // Mark firstLogin as false for demo (don't show welcome wizard)
    if (owner) {
      owner.firstLogin = true; // Actually show tour for demo users
      await owner.save();
    }

    const payload = {
      id: owner._id.toString(),
      tenantId: owner.tenantId.toString(),
      role: 'owner_admin',
      name: 'Demo User',
      businessType: businessTypeKey,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    logger.info(`Demo tenant created: ${result.tenant.tenantCode} (${businessTypeKey})`);

    return success(res, {
      statusCode: 201,
      message: 'Demo environment created! You are now logged in.',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: owner._id,
          name: 'Demo User',
          email: demoEmail,
          role: 'owner_admin',
          tenantId: owner.tenantId,
          firstLogin: true,
          businessType: businessTypeKey,
          businessName: result.tenant.businessName,
          isDemo: true,
        },
        tenant: {
          id: result.tenant._id,
          businessName: result.tenant.businessName,
          businessType: businessTypeKey,
          tenantCode: result.tenant.tenantCode,
          expiresAt: result.tenant.demoExpiresAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/public/demo/reset — Reset demo data
// ============================================================

router.post('/reset', async (req, res, next) => {
  try {
    const { tenantId, businessTypeKey } = req.body;

    if (!tenantId || !businessTypeKey) {
      return error(res, {
        statusCode: 400,
        message: 'tenantId and businessTypeKey are required.',
        code: 'MISSING_FIELDS',
      });
    }

    // Verify tenant is a demo
    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.isDemo) {
      return error(res, {
        statusCode: 404,
        message: 'Demo tenant not found.',
        code: 'NOT_FOUND',
      });
    }

    // Clear existing demo data
    await clearDemoData(tenantId);

    // Re-seed fresh data
    await seedDemoData(tenantId, businessTypeKey);

    // Update expiry
    tenant.demoExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await tenant.save();

    logger.info(`Demo data reset for tenant ${tenantId}`);

    return success(res, {
      message: 'Demo data has been reset with fresh sample data.',
      data: {
        tenantId: tenant._id,
        expiresAt: tenant.demoExpiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
