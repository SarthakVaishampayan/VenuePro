// ============================================================
// NOTIFICATION ROUTES — In-App Notifications
// ============================================================

import { Router } from 'express';
import notificationService from '../services/notificationService.js';
import { tenantAuth, superAdminAuth } from '../middleware/auth.js';
import { success } from '../utils/responseHelper.js';

const tenantRouter = Router();
const platformRouter = Router();

// ============================================================
// TENANT ROUTES (owner/staff) — /api/tenant/notifications
// ============================================================

/**
 * @swagger
 * /api/tenant/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: List of notifications
 */
tenantRouter.get('/', tenantAuth, async (req, res, next) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    const filter = { userId: req.user.id };

    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      notificationService.list(filter, parseInt(limit)),
      notificationService.getUnreadCount(req.user.id)
    ]);

    return success(res, {
      data: notifications,
      meta: { unreadCount, total: notifications.length }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tenant/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread notification count
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
tenantRouter.get('/unread-count', tenantAuth, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return success(res, { data: { count } });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tenant/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
tenantRouter.patch('/:id/read', tenantAuth, async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return success(res, { message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tenant/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
tenantRouter.patch('/read-all', tenantAuth, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return success(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PLATFORM ROUTES (super admin) — /api/platform/notifications
// ============================================================

/**
 * @swagger
 * /api/platform/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the super admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
platformRouter.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    const filter = { userId: req.user.id };

    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      notificationService.list(filter, parseInt(limit)),
      notificationService.getUnreadCount(req.user.id)
    ]);

    return success(res, {
      data: notifications,
      meta: { unreadCount, total: notifications.length }
    });
  } catch (err) {
    next(err);
  }
});

platformRouter.get('/unread-count', superAdminAuth, async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return success(res, { data: { count } });
  } catch (err) {
    next(err);
  }
});

platformRouter.patch('/:id/read', superAdminAuth, async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return success(res, { message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

platformRouter.patch('/read-all', superAdminAuth, async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return success(res, { message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export { tenantRouter, platformRouter };
export default tenantRouter;
