import mongoose from 'mongoose';

const changeSchema = new mongoose.Schema({
  field: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  actorRole: {
    type: String,
    enum: ['super_admin', 'owner_admin', 'staff', 'customer', 'system'],
    required: true
  },
  actorName: {
    type: String
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  action: {
    type: String,
    required: true,
    enum: [
      'create', 'update', 'delete', 'login', 'logout', 'login_failed',
      'password_change', 'password_reset', 'subscription_change',
      'plan_change', 'status_change', 'suspension', 'payment_recorded',
      'invoice_generated', 'invoice_cancelled', 'ticket_created',
      'ticket_updated', 'ticket_resolved', 'tenant_provisioned',
      'tenant_suspended', 'tenant_activated', 'tenant_hidden_from_dashboard',
      'tenant_shown_on_dashboard', 'toggle-visibility', 'bulk_action',
      'export', 'import', 'system_action'
    ]
  },
  module: {
    type: String,
    required: true,
    enum: [
      'auth', 'tenants', 'business_types', 'subscriptions',
      'invoices', 'payments', 'tickets', 'settings',
      'resources', 'sessions', 'customers', 'staff',
      'reports', 'system', 'import_export'
    ]
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  targetModel: {
    type: String,
    default: null
  },
  description: {
    type: String,
    maxlength: 500
  },
  changes: [changeSchema],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    maxlength: 45
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  requestId: {
    type: String
  },
  // Outcome
  outcome: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  errorMessage: String
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
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // For TTL / cleanup
auditLogSchema.index({ actorRole: 1 });

// TTL-like cleanup: static method to delete logs older than retention period
auditLogSchema.statics.cleanupOldLogs = async function (retentionDays = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return this.deleteMany({ createdAt: { $lt: cutoff } });
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
