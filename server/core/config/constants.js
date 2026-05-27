// ============================================================
// VENUEPRO SAAS — System Constants
// ============================================================

export const BUSINESS_TYPES = {
  POOL_SNOOKER: {
    key: 'pool_snooker',
    name: 'Pool & Snooker Parlour',
    resourceLabelSingular: 'Table',
    resourceLabelPlural: 'Tables',
    bookingLabelSingular: 'Session',
    bookingLabelPlural: 'Sessions',
    customerLabelSingular: 'Player',
    customerLabelPlural: 'Players',
    pricingStrategy: 'time_based',
    bookingMode: 'session',
    enabledModules: ['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers'],
    defaultSettings: {
      roundingMinutes: 5,
      roundStartDown: true,
      roundEndUp: true,
      roundAmountToNearest: 5
    }
  },
  CRICKET_FOOTBALL: {
    key: 'cricket_football',
    name: 'Cricket & Football Turf',
    resourceLabelSingular: 'Turf',
    resourceLabelPlural: 'Turfs',
    bookingLabelSingular: 'Booking',
    bookingLabelPlural: 'Bookings',
    customerLabelSingular: 'Player',
    customerLabelPlural: 'Players',
    pricingStrategy: 'slot_based',
    bookingMode: 'slot',
    enabledModules: ['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers'],
    defaultSettings: {
      slotDurationMinutes: 60,
      bufferBetweenSlots: 15
    }
  },
  GAMING_ZONE: {
    key: 'gaming_zone',
    name: 'Gaming Zone',
    resourceLabelSingular: 'Console',
    resourceLabelPlural: 'Consoles',
    bookingLabelSingular: 'Session',
    bookingLabelPlural: 'Sessions',
    customerLabelSingular: 'Player',
    customerLabelPlural: 'Players',
    pricingStrategy: 'time_based',
    bookingMode: 'session',
    enabledModules: ['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers'],
    defaultSettings: {
      roundingMinutes: 5,
      roundStartDown: true,
      roundEndUp: true,
      roundAmountToNearest: 5
    }
  },
  PICKLEBALL: {
    key: 'pickleball',
    name: 'Pickleball Court',
    resourceLabelSingular: 'Court',
    resourceLabelPlural: 'Courts',
    bookingLabelSingular: 'Booking',
    bookingLabelPlural: 'Bookings',
    customerLabelSingular: 'Player',
    customerLabelPlural: 'Players',
    pricingStrategy: 'time_based',
    bookingMode: 'configurable',
    enabledModules: ['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers'],
    defaultSettings: {}
  }
};

// ============================================================
// STATUS ENUMS
// ============================================================

export const TENANT_STATUS = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  OVERDUE: 'overdue',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired'
};

export const BOOKING_STATUS = {
  BOOKED: 'booked',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIAL: 'partial',
  DUE: 'due'
};

export const DUE_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  WAIVED: 'waived'
};

export const RESOURCE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  MAINTENANCE: 'maintenance',
  DISABLED: 'disabled'
};

export const STAFF_ROLES = {
  MANAGER: 'manager',
  STAFF: 'staff',
  CASHIER: 'cashier'
};

export const PAYMENT_MODES = {
  CASH: 'cash',
  ONLINE: 'online',
  UPI: 'upi',
  CARD: 'card'
};

export const SUBSCRIPTION_STATUS = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

export const INVOICE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
};

export const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

export const TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly'
};

// ============================================================
// SYSTEM CONFIG
// ============================================================

export const SYSTEM_CONFIG = {
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  BCRYPT_SALT_ROUNDS: 12,
  DEFAULT_TRIAL_DAYS: 14,
  RATE_LIMIT_AUTH: { windowMs: 15 * 60 * 1000, max: 10 },
  RATE_LIMIT_GENERAL: { windowMs: 60 * 1000, max: 100 },
  ACCOUNT_LOCKOUT_THRESHOLD: 5,
  ACCOUNT_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  PASSWORD_MIN_LENGTH: 8,
  REQUEST_SIZE_LIMIT: '10mb',
  DEMO_TENANT_TTL_HOURS: 24,
  AUDIT_LOG_RETENTION_DAYS: 365
};
