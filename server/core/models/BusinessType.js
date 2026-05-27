import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  resourceSingular: { type: String, required: true },
  resourcePlural: { type: String, required: true },
  bookingSingular: { type: String, required: true },
  bookingPlural: { type: String, required: true },
  customerSingular: { type: String, required: true },
  customerPlural: { type: String, required: true }
}, { _id: false });

const defaultSettingsSchema = new mongoose.Schema({
  roundingMinutes: { type: Number, default: 5 },
  roundStartDown: { type: Boolean, default: true },
  roundEndUp: { type: Boolean, default: true },
  roundAmountToNearest: { type: Number, default: 5 },
  slotDurationMinutes: { type: Number, default: 60 },
  bufferBetweenSlots: { type: Number, default: 15 }
}, { _id: false });

const businessTypeSchema = new mongoose.Schema({
  key: {
    type: String,
    required: [true, 'Business type key is required'],
    unique: true,
    lowercase: true,
    trim: true,
    minlength: [3, 'Key must be at least 3 characters'],
    maxlength: [30, 'Key cannot exceed 30 characters'],
    match: [/^[a-z_]+$/, 'Key must be lowercase with underscores only']
  },
  name: {
    type: String,
    required: [true, 'Business type name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  labels: {
    type: labelSchema,
    required: true
  },
  pricingStrategy: {
    type: String,
    enum: ['time_based', 'slot_based', 'configurable'],
    required: true
  },
  bookingMode: {
    type: String,
    enum: ['session', 'slot', 'configurable'],
    required: true
  },
  enabledModules: [{
    type: String,
    enum: ['resources', 'sessions', 'payments', 'dues', 'expenses', 'staff', 'reports', 'customers', 'booking_portal']
  }],
  defaultSettings: defaultSettingsSchema,
  availableTimezones: [{
    type: String
  }],
  icon: {
    type: String,
    default: null
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'development'],
    default: 'active'
  },
  isDefault: {
    type: Boolean,
    default: false
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

// Indexes (key already indexed via `unique: true`)
businessTypeSchema.index({ status: 1 });
businessTypeSchema.index({ sortOrder: 1 });

const BusinessType = mongoose.model('BusinessType', businessTypeSchema);
export default BusinessType;
