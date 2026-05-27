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
    ref: 'Turf',
    required: true
  },
  resourceNameSnapshot: {
    type: String
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  customerNameSnapshot: {
    type: String
  },
  customerCodeSnapshot: {
    type: String
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
  opponentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    default: null
  },
  opponentNameSnapshot: {
    type: String
  },
  startTime: {
    type: Date,
    required: true
  },
  startTimeRounded: {
    type: Date
  },
  endTime: {
    type: Date
  },
  endTimeRounded: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  bookedDuration: {
    type: Number,
    default: 0
  },
  bookingStatus: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  },
  pricingMode: {
    type: String,
    enum: ['day', 'night'],
    default: 'day'
  },
  pricingModeAtStart: {
    type: String,
    enum: ['day', 'night'],
    default: null
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
  dayPrice: { type: Number },
  nightPrice: { type: Number },
  hourlyRate: { type: Number },
  rawAmount: { type: Number, default: 0 },
  roundedAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountReason: {
    type: String,
    default: ''
  },
  finalAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'due', 'partial'],
    default: 'pending'
  },
  payablePlayer: {
    type: String,
    default: null
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
  timestamps: true
});

bookingSessionSchema.index({ tenantId: 1, bookingStatus: 1 });
bookingSessionSchema.index({ tenantId: 1, resourceId: 1, bookingStatus: 1 });
bookingSessionSchema.index({ tenantId: 1, startTime: -1 });
bookingSessionSchema.index({ tenantId: 1, customerId: 1 });

const BookingSession = mongoose.model('CricketFootballBookingSession', bookingSessionSchema);
export default BookingSession;
