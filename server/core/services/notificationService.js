// ============================================================
// NOTIFICATION SERVICE — Full Phase 9 Implementation
// ============================================================

import Notification from '../models/Notification.js';
import { logger } from '../config/logger.js';
import eventBus from '../events/eventBus.js';
import { EVENT_TYPES } from '../events/eventTypes.js';

class NotificationService {
  /**
   * Create a notification and emit notification.created event
   * @param {Object} data
   * @returns {Promise<Object|null>}
   */
  async create(data) {
    try {
      const notification = await Notification.create({
        tenantId: data.tenantId || null,
        userId: data.userId,
        userRole: data.userRole || 'owner_admin',
        eventType: data.eventType,
        title: data.title,
        message: data.message,
        data: data.data || {},
        channel: data.channel || 'in_app',
        priority: data.priority || 'medium',
        scheduledFor: data.scheduledFor || null,
        sentAt: data.channel === 'in_app' ? new Date() : null,
        deliveryStatus: data.channel === 'in_app' ? 'sent' : 'pending'
      });

      // Emit event for external delivery (email/SMS) if not just in_app
      if (data.channel && data.channel !== 'in_app') {
        eventBus.emit(EVENT_TYPES.NOTIFICATION_CREATED, {
          notificationId: notification._id,
          channel: data.channel,
          userId: data.userId,
          userRole: data.userRole,
          eventType: data.eventType,
          title: data.title,
          message: data.message
        });
      }

      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', { error: error.message });
      return null;
    }
  }

  /**
   * Send notification via external channels (email/SMS)
   */
  async send(notificationId, channels = ['in_app']) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        logger.warn(`Notification ${notificationId} not found for sending`);
        return false;
      }

      for (const channel of channels) {
        if (channel === 'in_app') continue;
        // Each channel handler picks this up via event bus subscribers
        eventBus.emit(EVENT_TYPES.NOTIFICATION_SEND, {
          notificationId: notification._id,
          channel,
          userId: notification.userId,
          userRole: notification.userRole,
          eventType: notification.eventType,
          title: notification.title,
          message: notification.message,
          data: notification.data
        });
      }

      notification.deliveryStatus = 'sent';
      await notification.save();
      return true;
    } catch (error) {
      logger.error('Failed to send notification:', { error: error.message });
      return false;
    }
  }

  /**
   * List notifications with filtering
   */
  async list(filter = {}, limit = 50) {
    return Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get unread notifications for a user
   */
  async getUnread(userId, limit = 20) {
    return Notification.find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    return Notification.markAllAsRead(userId);
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    return Notification.unreadCount(userId);
  }

  /**
   * Create notification for multiple users (e.g., owner + all staff)
   */
  async notifyMultiple(users, data) {
    const results = await Promise.allSettled(
      users.map(user => this.create({ ...data, userId: user.userId, userRole: user.userRole }))
    );
    return results.filter(r => r.status === 'fulfilled').map(r => r.value);
  }
}

export default new NotificationService();
