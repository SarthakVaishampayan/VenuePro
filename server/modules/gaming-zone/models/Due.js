import mongoose from 'mongoose';

const dueSchema = new mongoose.Schema({
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
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  bookingSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GamingZoneBookingSession',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'waived'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'online', 'upi', 'card'],
    default: null
  },
  partialPayments: [{
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['cash', 'online', 'upi', 'card'], required: true },
    paidAt: { type: Date, default: Date.now }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  collection: 'gaming_zone_dues'
});

dueSchema.index({ tenantId: 1, status: 1 });
dueSchema.index({ tenantId: 1, customerId: 1 });

const GamingZoneDue = mongoose.model('GamingZoneDue', dueSchema);
export default GamingZoneDue;
