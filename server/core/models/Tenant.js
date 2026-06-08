import mongoose from 'mongoose';
import crypto from 'crypto';

const addressSchema = new mongoose.Schema({
  street: { type: String, maxlength: 200 },
  city: { type: String, maxlength: 100 },
  state: { type: String, maxlength: 100 },
  postalCode: { type: String, maxlength: 20 },
  country: { type: String, default: 'India', maxlength: 100 }
}, { _id: false });

const subscriptionInfoSchema = new mongoose.Schema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
  status: {
    type: String,
    enum: ['trialing', 'active', 'overdue', 'suspended', 'expired', 'cancelled'],
    default: 'trialing'
  },
  trialEndsAt: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'yearly'],
    default: 'monthly'
  }
}, { _id: false });

const tenantSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    minlength: [2, 'Business name must be at least 2 characters'],
    maxlength: [200, 'Business name cannot exceed 200 characters']
  },
  businessTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessType',
    required: [true, 'Business type is required']
  },
  tenantCode: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Tenant code must be at least 3 characters'],
    maxlength: [20, 'Tenant code cannot exceed 20 characters'],
    match: [/^[a-z0-9-]+$/, 'Tenant code must be lowercase alphanumeric with hyphens only']
  },
  // Owner information
  ownerName: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true,
    maxlength: [100, 'Owner name cannot exceed 100 characters']
  },
  ownerEmail: {
    type: String,
    required: [true, 'Owner email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  ownerPhone: {
    type: String,
    required: [true, 'Owner phone is required'],
    match: [/^[+]?[0-9]{10,15}$/, 'Phone must be 10-15 digits']
  },
  address: addressSchema,
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD']
  },
  portalStatus: {
    type: String,
    enum: ['active', 'suspended', 'disabled'],
    default: 'active'
  },
  subscription: subscriptionInfoSchema,
  onboardingStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'skipped'],
    default: 'pending'
  },
  onboardingStep: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  branchCount: {
    type: Number,
    default: 1
  },
  maxBranches: {
    type: Number,
    default: 1
  },
  maxResources: {
    type: Number,
    default: 2
  },
  maxStaff: {
    type: Number,
    default: 2
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  // Visibility on player-facing venue dashboard
  visibleOnPlayerDashboard: {
    type: Boolean,
    default: true
  },
  // Demo tenant management
  isDemo: {
    type: Boolean,
    default: false
  },
  demoExpiresAt: Date,
  // Provisioning metadata
  provisionedAt: Date,
  provisionedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
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

// Indexes (tenantCode already indexed via `unique: true`)
tenantSchema.index({ ownerEmail: 1 });
tenantSchema.index({ ownerPhone: 1 });
tenantSchema.index({ businessTypeId: 1 });
tenantSchema.index({ 'subscription.status': 1 });
tenantSchema.index({ isActive: 1 });
tenantSchema.index({ isDemo: 1, demoExpiresAt: 1 });

// Pre-validate: generate tenantCode if not provided (for self-service signup)
// Must run before validation so the required check passes
tenantSchema.pre('validate', function (next) {
  if (!this.tenantCode) {
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const base = this.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 11); // Keep max at 18 chars (11 + '-' + 6 hex) to stay under maxlength:20
    this.tenantCode = `${base || 'venue'}-${randomSuffix}`;
  }
  next();
});

// Static: find by tenant code with business type populated
tenantSchema.statics.findByCode = function (code) {
  return this.findOne({ tenantCode: code }).populate('businessTypeId');
};

const Tenant = mongoose.model('Tenant', tenantSchema);
export default Tenant;
