import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userRole: {
    type: String,
    enum: ['super_admin', 'owner_admin', 'staff'],
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'booking_created', 'session_started', 'session_ended',
      'payment_received', 'due_created', 'due_paid',
      'trial_expiring', 'subscription_overdue', 'subscription_expired',
      'subscription_renewed', 'invoice_generated', 'staff_action',
      'system_alert', 'maintenance_reminder', 'customer_registered'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  channel: {
    type: String,
    enum: ['in_app', 'email', 'sms', 'whatsapp', 'all'],
    default: 'in_app'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // For scheduling future notifications
  scheduledFor: Date,
  sentAt: Date,
  // Delivery status for external channels
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  deliveryError: String,
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, createdAt: -1 });
notificationSchema.index({ eventType: 1, createdAt: -1 });
notificationSchema.index({ deliveryStatus: 1 });
notificationSchema.index({ scheduledFor: 1 }, { sparse: true });

// Static: mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static: get unread count for a user
notificationSchema.statics.unreadCount = async function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
