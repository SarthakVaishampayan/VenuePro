import mongoose from 'mongoose';

const staffShiftSchema = new mongoose.Schema({
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
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffUser',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'checked_in', 'checked_out', 'absent', 'cancelled'],
    default: 'scheduled'
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedOutAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 300
  }
}, {
  timestamps: true
});

staffShiftSchema.index({ tenantId: 1, staffId: 1, date: -1 });
staffShiftSchema.index({ tenantId: 1, branchId: 1, date: -1 });

const StaffShift = mongoose.model('StaffShift', staffShiftSchema);
export default StaffShift;
