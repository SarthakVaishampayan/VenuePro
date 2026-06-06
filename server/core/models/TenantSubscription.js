import mongoose from 'mongoose';

const tenantSubscriptionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  planSnapshot: {
    name: String,
    key: String,
    prices: {
      monthly: Number,
      quarterly: Number,
      semiAnnual: Number,
      yearly: Number
    },
    limits: {
      branches: Number,
      resources: Number,
      staff: Number
    }
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'yearly'],
    default: 'monthly',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['trialing', 'active', 'overdue', 'suspended', 'expired', 'cancelled'],
    default: 'trialing'
  },
  trialStartDate: Date,
  trialEndDate: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelledAt: Date,
  cancelledReason: String,
  // Grace period
  gracePeriodDays: {
    type: Number,
    default: 7
  },
  gracePeriodEnd: Date,
  // Overdue tracking
  overdueSince: Date,
  overdueAmount: {
    type: Number,
    default: 0
  },
  suspensionDate: Date,
  // Payment history summary
  totalPaid: {
    type: Number,
    default: 0
  },
  lastPaymentDate: Date,
  lastPaymentAmount: Number,
  paymentCount: {
    type: Number,
    default: 0
  },
  // Notes for super admin
  notes: {
    type: String,
    maxlength: 1000
  },
  // Discount applied by super admin
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountReason: String
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
tenantSubscriptionSchema.index({ tenantId: 1 });
tenantSubscriptionSchema.index({ status: 1 });
tenantSubscriptionSchema.index({ currentPeriodEnd: 1 });
tenantSubscriptionSchema.index({ 'planSnapshot.key': 1 });

// Static: find active subscriptions
tenantSubscriptionSchema.statics.findActiveByTenant = function (tenantId) {
  return this.findOne({ tenantId, status: { $in: ['trialing', 'active'] } });
};

// Instance method: check if overdue
tenantSubscriptionSchema.methods.isOverdue = function () {
  return this.status === 'overdue' || (this.currentPeriodEnd && new Date() > this.currentPeriodEnd);
};

const TenantSubscription = mongoose.model('TenantSubscription', tenantSubscriptionSchema);
export default TenantSubscription;
