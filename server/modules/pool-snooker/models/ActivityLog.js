import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['owner_admin', 'manager', 'staff', 'cashier'],
    required: true
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entity: {
    type: String,
    enum: ['session', 'payment', 'customer', 'resource', 'expense', 'due', 'staff', 'branch', 'setting'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

activityLogSchema.index({ tenantId: 1, createdAt: -1 });
activityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
activityLogSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
activityLogSchema.index({ tenantId: 1, entity: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
