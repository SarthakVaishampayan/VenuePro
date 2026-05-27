import mongoose from 'mongoose';

const courtSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: [true, 'Court name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  code: {
    type: String,
    trim: true,
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  category: {
    type: String,
    enum: ['standard', 'premium', 'indoor', 'outdoor'],
    default: 'standard'
  },
  pricingRules: [{
    type: { type: String, enum: ['weekday', 'weekend', 'peak_hours', 'festival'], default: 'weekday' },
    rate: { type: Number, required: true, min: 0 },
    startHour: { type: Number, min: 0, max: 23 },
    endHour: { type: Number, min: 0, max: 23 },
    days: [String]
  }],
  dayPrice: {
    type: Number,
    required: [true, 'Day price is required'],
    min: [0, 'Price cannot be negative']
  },
  nightPrice: {
    type: Number,
    required: [true, 'Night price is required'],
    min: [0, 'Price cannot be negative']
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'disabled'],
    default: 'available'
  },
  capacity: {
    type: Number,
    default: 4,
    min: 1
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

courtSchema.index({ tenantId: 1, status: 1 });
courtSchema.index({ tenantId: 1, branchId: 1 });
courtSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Court = mongoose.model('Court', courtSchema);
export default Court;
