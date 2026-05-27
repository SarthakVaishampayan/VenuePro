import mongoose from 'mongoose';

const bookingSessionSchema = new mongoose.Schema({
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
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VenueResource',
    required: true
  },
  resourceNameSnapshot: {
    type: String,
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  customerNameSnapshot: {
    type: String,
    required: true
  },
  customerUniqueId: {
    type: String,
    default: null
  },
  secondaryCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  secondaryCustomerNameSnapshot: {
    type: String,
    default: null
  },
  secondaryCustomerUniqueId: {
    type: String,
    default: null
  },
  startTime: {
    type: Date,
    required: true
  },
  startTimeRounded: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  endTimeRounded: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  bookingStatus: {
    type: String,
    enum: ['booked', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'in_progress'
  },
  pricingModeAtStart: {
    type: String,
    enum: ['day', 'night'],
    required: true
  },
  pricingModeAtEnd: {
    type: String,
    enum: ['day', 'night'],
    default: null
  },
  rateSnapshot: {
    dayPrice: { type: Number },
    nightPrice: { type: Number }
  },
  rawAmount: {
    type: Number,
    default: 0
  },
  roundedAmount: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  discountReason: {
    type: String,
    default: ''
  },
  finalAmount: {
    type: Number,
    default: 0
  },
  payableCustomer: {
    type: String,
    default: null
  },
  payableCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  loserCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'due', 'partial'],
    default: 'pending'
  },
  bookingType: {
    type: String,
    enum: ['walk_in', 'advance'],
    default: 'walk_in'
  },
  payments: [{
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['cash', 'online', 'upi', 'card'], required: true },
    createdAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId }
  }],
  createdByUserId: {
    type: mongoose.Schema.Types.ObjectId
  },
  createdByRole: {
    type: String,
    enum: ['owner_admin', 'manager', 'staff'],
    default: 'owner_admin'
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

bookingSessionSchema.index({ tenantId: 1, bookingStatus: 1, startTime: -1 });
bookingSessionSchema.index({ tenantId: 1, resourceId: 1, startTime: 1, endTime: 1 });
bookingSessionSchema.index({ tenantId: 1, customerId: 1 });
bookingSessionSchema.index({ tenantId: 1, createdAt: -1 });

const BookingSession = mongoose.model('BookingSession', bookingSessionSchema);
export default BookingSession;
