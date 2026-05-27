import express from 'express';
import { z } from 'zod';
import { superAdminAuth } from '../middleware/auth.js';
import { success as successResponse, paginationMeta } from '../utils/responseHelper.js';
import Player from '../models/Player.js';
import Tenant from '../models/Tenant.js';

const router = express.Router();

/**
 * @swagger
 * /api/platform/customers:
 *   get:
 *     tags: [Platform Customers]
 *     summary: List all customers across all tenants
 *     description: Super admin view of all players with tenant info, searchable and paginated
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, code, or phone
 *       - in: query
 *         name: tenantId
 *         schema: { type: string }
 *         description: Filter by specific tenant
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by specific tenant if provided
    if (req.query.tenantId) {
      filter.tenantId = req.query.tenantId;
    }

    // Search by name, code, or phone
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { fullName: searchRegex },
        { nickname: searchRegex },
        { customerCode: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Build filter for Player model
    // - If tenantId is specified: only get players for that tenant
    // - If no tenantId: get ALL players (both tenant-associated and self-signed)
    const playerFilter = { ...filter };

    const [players, total] = await Promise.all([
      Player.find(playerFilter)
        .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Player.countDocuments(playerFilter)
    ]);

    // Attach tenant business names
    const tenantIds = [...new Set(players.map(p => p.tenantId?.toString()).filter(Boolean))];
    const tenants = await Tenant.find({ _id: { $in: tenantIds } })
      .select('businessName businessTypeId')
      .populate('businessTypeId', 'key name')
      .lean();

    const tenantMap = {};
    for (const t of tenants) {
      tenantMap[t._id.toString()] = {
        businessName: t.businessName,
        businessType: t.businessTypeId?.key || 'pool_snooker',
        businessTypeName: t.businessTypeId?.name || 'Pool & Snooker'
      };
    }

    const data = players.map(p => ({
      ...p,
      linkedVenues: p.linkedTenants?.length || 0,
      source: p.tenantId ? 'venue' : 'portal',
      tenant: p.tenantId ? (tenantMap[p.tenantId.toString()] || null) : null
    }));

    return successResponse(res, {
      data,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
