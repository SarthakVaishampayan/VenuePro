import mongoose from 'mongoose';

const branchSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  operatingHours: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '23:00' }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

branchSchema.index({ tenantId: 1, code: 1 }, { unique: true, sparse: true });

const Branch = mongoose.model('Branch', branchSchema);
export default Branch;
