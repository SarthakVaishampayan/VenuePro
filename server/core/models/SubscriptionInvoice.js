import mongoose from 'mongoose';

const invoiceLineSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['subscription', 'discount', 'adjustment', 'credit_note'],
    default: 'subscription'
  }
}, { _id: false });

const subscriptionInvoiceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  tenantSubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TenantSubscription'
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Billing period
  billingPeriodStart: {
    type: Date,
    required: true
  },
  billingPeriodEnd: {
    type: Date,
    required: true
  },
  // Invoice details
  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'semi_annual', 'yearly'],
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  lines: [invoiceLineSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'bank_transfer', 'upi', 'cheque', null],
    default: null
  },
  paymentReference: String,
  paidAt: Date,
  paidAmount: Number,
  // Metadata
  notes: String,
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  isVoid: {
    type: Boolean,
    default: false
  },
  voidReason: String,
  voidedAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes (invoiceNumber already indexed via `unique: true`)
subscriptionInvoiceSchema.index({ tenantId: 1, createdAt: -1 });
subscriptionInvoiceSchema.index({ paymentStatus: 1 });
subscriptionInvoiceSchema.index({ billingPeriodStart: 1, billingPeriodEnd: 1 });

// Generate invoice number automatically
subscriptionInvoiceSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year = new Date().getFullYear();
    // Find the last invoice for this year to generate sequential number
    const lastInvoice = await mongoose.model('SubscriptionInvoice')
      .findOne({ invoiceNumber: new RegExp(`^VENUEPRO-${year}-`) })
      .sort({ invoiceNumber: -1 });
    
    let seq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    this.invoiceNumber = `VENUEPRO-${year}-${String(seq).padStart(6, '0')}`;
  }
  next();
});

const SubscriptionInvoice = mongoose.model('SubscriptionInvoice', subscriptionInvoiceSchema);
export default SubscriptionInvoice;
