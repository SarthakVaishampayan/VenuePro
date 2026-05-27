import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
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
  bookingSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CricketFootballBookingSession',
    default: null
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  dueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CricketFootballDue',
    default: null
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  mode: {
    type: String,
    enum: ['cash', 'online', 'upi', 'card'],
    required: [true, 'Payment mode is required']
  },
  type: {
    type: String,
    enum: ['payment', 'refund', 'due_payment'],
    default: 'payment'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId
  },
  receivedByName: {
    type: String,
    default: 'owner'
  }
}, {
  timestamps: true,
  collection: 'cricket_football_payments'
});

paymentSchema.index({ tenantId: 1, createdAt: -1 });
paymentSchema.index({ tenantId: 1, mode: 1 });
paymentSchema.index({ tenantId: 1, bookingSessionId: 1 });
paymentSchema.index({ tenantId: 1, customerId: 1 });

const CricketFootballPayment = mongoose.model('CricketFootballPayment', paymentSchema);
export default CricketFootballPayment;
