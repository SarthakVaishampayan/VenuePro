import ActivityLog from '../models/ActivityLog.js';
import { success, error } from '../../../core/utils/responseHelper.js';

/**
 * @swagger
 * /api/tenant/activity-logs:
 *   get:
 *     tags: [Activity Logs]
 *     summary: List activity logs with filtering
 */
export const getActivityLogs = async (req, res, next) => {
  try {
    const { branchId, userId, entity, action, dateFrom, dateTo, limit = 50, page = 1 } = req.query;
    const filter = { tenantId: req.tenantId };

    if (branchId) filter.branchId = branchId;
    if (userId) filter.userId = userId;
    if (entity) filter.entity = entity;
    if (action) filter.action = action;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ActivityLog.countDocuments(filter)
    ]);

    return success(res, {
      data: logs,
      meta: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @swagger
 * /api/tenant/activity-logs/stats:
 *   get:
 *     tags: [Activity Logs]
 *     summary: Get activity log summary stats
 */
export const getActivityStats = async (req, res, next) => {
  try {
    const stats = await ActivityLog.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        byEntity: { $push: { entity: '$entity', action: '$action' } }
      }}
    ]);

    // Breakdown by entity
    const entityBreakdown = await ActivityLog.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $group: { _id: '$entity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent activity by user
    const byUser = await ActivityLog.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $group: { _id: { userId: '$userId', userName: '$userName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Activity for last 7 days
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      const count = await ActivityLog.countDocuments({
        tenantId: req.tenantId,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });

      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        label: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count
      });
    }

    return success(res, {
      data: {
        total: stats[0]?.total || 0,
        entityBreakdown,
        byUser,
        dailyActivity
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Utility to create an activity log entry (to be used by other controllers)
 */
export const logActivity = async ({ tenantId, branchId, userId, userName, userRole, action, entity, entityId, details, metadata, ip }) => {
  try {
    await ActivityLog.create({
      tenantId, branchId: branchId || null, userId, userName,
      userRole: userRole || 'owner_admin', action, entity,
      entityId: entityId || null, details: details || '',
      metadata: metadata || {}, ip: ip || ''
    });
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
};
