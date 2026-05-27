// ============================================================
// EVENT SUBSCRIBERS — Map events to notifications
// ============================================================
// All event subscribers are registered here.
// Each subscriber listens to a specific event type and creates
// the appropriate notification(s) when the event fires.

import eventBus from './eventBus.js';
import { EVENT_TYPES } from './eventTypes.js';
import notificationService from '../services/notificationService.js';
import emailService from '../services/emailService.js';
import { logger } from '../config/logger.js';

/**
 * Register all event subscribers.
 * Called once during server startup.
 */
export const registerSubscribers = () => {
  logger.info('[EventBus] Registering notification subscribers...');

  // ============================================================
  // TENANT EVENTS
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.TENANT_PROVISIONED, async (data) => {
    // Notify super admin about new tenant
    await notificationService.create({
      userId: data.superAdminId,
      userRole: 'super_admin',
      eventType: 'tenant.created',
      title: 'New Tenant Created',
      message: `${data.tenantName} (${data.tenantCode}) has been provisioned`,
      data: { tenantId: data.tenantId, tenantCode: data.tenantCode },
      priority: 'medium'
    });

    // Send welcome email to owner
    if (data.ownerEmail) {
      await emailService.sendWelcome({
        to: data.ownerEmail,
        name: data.ownerName,
        tenantName: data.tenantName,
        tenantCode: data.tenantCode
      });
    }
  });

  eventBus.subscribe(EVENT_TYPES.TENANT_SUSPENDED, async (data) => {
    // Notify owner about suspension
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'subscription_overdue',
        title: 'Account Suspended',
        message: data.reason || 'Your account has been suspended due to subscription issues.',
        data: { tenantId: data.tenantId },
        priority: 'urgent',
        channel: 'all'
      });
    }
  });

  // ============================================================
  // SUBSCRIPTION EVENTS
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.SUBSCRIPTION_OVERDUE, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'subscription_overdue',
        title: 'Payment Overdue',
        message: `Your subscription payment of ₹${data.amount || '—'} is overdue. Please pay within the grace period to avoid suspension.`,
        data: { tenantId: data.tenantId, amount: data.amount },
        priority: 'high',
        channel: 'all'
      });
    }
  });

  eventBus.subscribe(EVENT_TYPES.SUBSCRIPTION_EXPIRED, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'subscription_expired',
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Renew now to restore access.',
        data: { tenantId: data.tenantId },
        priority: 'urgent',
        channel: 'all'
      });
    }
  });

  eventBus.subscribe(EVENT_TYPES.SUBSCRIPTION_RENEWED, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'subscription_renewed',
        title: 'Subscription Renewed',
        message: `Your subscription has been renewed successfully${data.expiryDate ? ` until ${new Date(data.expiryDate).toLocaleDateString()}` : ''}.`,
        data: { tenantId: data.tenantId, expiryDate: data.expiryDate },
        priority: 'medium'
      });
    }
  });

  // ============================================================
  // BOOKING / SESSION EVENTS
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.SESSION_STARTED, async (data) => {
    // Notify owner/staff
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'session_started',
        title: 'Session Started',
        message: `${data.customerName || 'A customer'} started a session on ${data.resourceName || 'a resource'}`,
        data: { tenantId: data.tenantId, sessionId: data.sessionId, resourceName: data.resourceName },
        priority: 'low'
      });
    }
  });

  eventBus.subscribe(EVENT_TYPES.SESSION_ENDED, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'session_ended',
        title: 'Session Ended',
        message: `Session on ${data.resourceName || 'a resource'} ended. Amount: ₹${data.amount || 0}`,
        data: { tenantId: data.tenantId, sessionId: data.sessionId, amount: data.amount },
        priority: 'low'
      });
    }
  });

  // ============================================================
  // PAYMENT EVENTS
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.PAYMENT_RECEIVED, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'payment_received',
        title: 'Payment Received',
        message: `₹${data.amount || 0} payment received from ${data.customerName || 'a customer'} via ${data.mode || 'cash'}`,
        data: { tenantId: data.tenantId, paymentId: data.paymentId, amount: data.amount, mode: data.mode },
        priority: 'medium'
      });

      // Send receipt email if customer has email
      if (data.customerEmail && data.customerEmail !== 'no-email@example.com') {
        await emailService.sendPaymentReceipt({
          to: data.customerEmail,
          customerName: data.customerName || 'Valued Customer',
          tenantName: data.tenantName || 'Your Venue',
          amount: data.amount || 0,
          mode: data.mode || 'Cash',
          date: new Date().toLocaleDateString(),
          reference: data.reference || '—'
        });
      }
    }
  });

  eventBus.subscribe(EVENT_TYPES.INVOICE_GENERATED, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'invoice_generated',
        title: 'Invoice Generated',
        message: `Invoice #${data.invoiceNumber || '—'} for ₹${data.amount || 0} has been generated`,
        data: { tenantId: data.tenantId, invoiceId: data.invoiceId, invoiceNumber: data.invoiceNumber, amount: data.amount },
        priority: 'medium'
      });
    }
  });

  // ============================================================
  // DUE EVENTS
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.DUE_CREATED, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'due_created',
        title: 'Due Added',
        message: `₹${data.amount || 0} due added for ${data.customerName || 'a customer'}`,
        data: { tenantId: data.tenantId, dueId: data.dueId, amount: data.amount },
        priority: 'medium'
      });
    }
  });

  eventBus.subscribe(EVENT_TYPES.DUE_PAID, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'due_paid',
        title: 'Due Cleared',
        message: `₹${data.amount || 0} due cleared by ${data.customerName || 'a customer'}`,
        data: { tenantId: data.tenantId, dueId: data.dueId, amount: data.amount },
        priority: 'medium'
      });
    }
  });

  // ============================================================
  // AUTH EVENTS
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.PASSWORD_RESET, async (data) => {
    if (data.email) {
      await emailService.sendPasswordReset({
        to: data.email,
        name: data.name || 'User',
        resetLink: data.resetLink
      });
    }
  });

  eventBus.subscribe(EVENT_TYPES.OWNER_SIGNUP, async (data) => {
    if (data.email) {
      await emailService.sendWelcome({
        to: data.email,
        name: data.name,
        tenantName: data.tenantName,
        tenantCode: data.tenantCode
      });
    }
  });

  // ============================================================
  // TRIAL EXPIRY
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.TRIAL_EXPIRING, async (data) => {
    if (data.ownerUserId) {
      await notificationService.create({
        tenantId: data.tenantId,
        userId: data.ownerUserId,
        userRole: 'owner_admin',
        eventType: 'trial_expiring',
        title: 'Trial Expiring Soon',
        message: `Your free trial expires on ${new Date(data.expiryDate).toLocaleDateString()}. Subscribe to keep using VenuePro.`,
        data: { tenantId: data.tenantId, expiryDate: data.expiryDate },
        priority: 'high',
        channel: 'all'
      });
    }
  });

  // ============================================================
  // NOTIFICATION SEND HANDLER
  // ============================================================

  eventBus.subscribe(EVENT_TYPES.NOTIFICATION_SEND, async (data) => {
    switch (data.channel) {
      case 'email':
        await emailService.sendRaw({
          to: data.userId, // Will be resolved to email in production
          subject: data.title,
          text: data.message
        });
        break;
      case 'sms':
        logger.info(`[SMS] Would send SMS to user ${data.userId}: ${data.message}`);
        break;
      case 'whatsapp':
        logger.info(`[WhatsApp] Would send WhatsApp to user ${data.userId}: ${data.message}`);
        break;
      default:
        logger.debug(`[Notification] Unknown channel: ${data.channel}`);
    }
  });

  logger.info('[EventBus] All notification subscribers registered');
};
