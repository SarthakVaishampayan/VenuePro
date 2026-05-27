// ============================================================
// EVENTS — Event Types
// ============================================================

export const EVENT_TYPES = {
  // Tenant lifecycle
  TENANT_CREATED: 'tenant.created',
  TENANT_PROVISIONED: 'tenant.provisioned',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_ACTIVATED: 'tenant.activated',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_OVERDUE: 'subscription.overdue',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_PLAN_CHANGED: 'subscription.plan_changed',

  // Payment events
  PAYMENT_RECEIVED: 'payment.received',
  INVOICE_GENERATED: 'invoice.generated',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',

  // Booking / session events
  BOOKING_CREATED: 'booking.created',
  BOOKING_BOOKED: 'booking.booked',
  BOOKING_CANCELLED: 'booking.cancelled',
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',

  // Notification events
  TRIAL_EXPIRING: 'trial.expiring',
  PASSWORD_RESET: 'auth.password_reset',
  NOTIFICATION_CREATED: 'notification.created',
  NOTIFICATION_SEND: 'notification.send',

  // Dues
  DUE_CREATED: 'due.created',
  DUE_PAID: 'due.paid',

  // Support
  TICKET_CREATED: 'ticket.created',
  TICKET_RESOLVED: 'ticket.resolved',

  // System
  SYSTEM_ALERT: 'system.alert',
  DEMO_EXPIRY: 'demo.expiry',

  // Auth
  OWNER_SIGNUP: 'auth.owner_signup',
  PLAYER_SIGNUP: 'auth.player_signup'
};
