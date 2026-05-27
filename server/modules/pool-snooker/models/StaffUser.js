import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const staffUserSchema = new mongoose.Schema({
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
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['manager', 'staff', 'cashier'],
    default: 'staff'
  },
  permissions: {
    canManageResources: { type: Boolean, default: false },
    canManageSessions: { type: Boolean, default: false },
    canManagePayments: { type: Boolean, default: false },
    canManageCustomers: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: false },
    canManageExpenses: { type: Boolean, default: false },
    canManageDues: { type: Boolean, default: false }
  },
  monthlySalary: {
    type: Number,
    default: 0,
    min: [0, 'Salary cannot be negative']
  },
  hasPortalAccess: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  payments: [{
    amount: { type: Number, required: true },
    type: { type: String, enum: ['full', 'half', 'partial'], required: true },
    date: { type: Date, default: Date.now },
    month: { type: String },
    year: { type: Number }
  }]
}, {
  timestamps: true
});

staffUserSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

staffUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

staffUserSchema.index({ tenantId: 1, role: 1 });
staffUserSchema.index({ tenantId: 1, phone: 1 });

const StaffUser = mongoose.model('StaffUser', staffUserSchema);
export default StaffUser;
