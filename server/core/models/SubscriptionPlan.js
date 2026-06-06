import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema({
  monthly: { type: Number, default: 0, min: 0 },
  quarterly: { type: Number, default: 0, min: 0 },
  semiAnnual: { type: Number, default: 0, min: 0 },
  yearly: { type: Number, default: 0, min: 0 }
}, { _id: false });

const limitSchema = new mongoose.Schema({
  branches: { type: Number, default: 1, min: 0 },
  resources: { type: Number, default: 2, min: 0 },
  staff: { type: Number, default: 2, min: 0 },
  storage: { type: Number, default: 100, min: 0 }, // MB
  apiRequests: { type: Number, default: 1000, min: 0 }
}, { _id: false });

const featureSchema = new mongoose.Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  included: { type: Boolean, default: false }
}, { _id: false });

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [100, 'Plan name cannot exceed 100 characters']
  },
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  prices: priceSchema,
  features: [featureSchema],
  limits: limitSchema,
  trialDays: {
    type: Number,
    default: 14,
    min: 0,
    max: 90
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true // Controls visibility on pricing page
  },
  badge: {
    type: String, // e.g., "Most Popular", "Best Value"
    default: null
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Auto-generate key from name on create
subscriptionPlanSchema.pre('validate', function (next) {
  if (this.isNew && !this.key) {
    this.key = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
  }
  next();
});

// Indexes (key already indexed via `unique: true`)
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

// Static: get plan by key
subscriptionPlanSchema.statics.findByKey = function (key) {
  return this.findOne({ key, isActive: true });
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
