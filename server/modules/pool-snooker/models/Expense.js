import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
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
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['electricity', 'rent', 'maintenance', 'supplies', 'salary', 'misc', 'cleaning', 'repairs', 'other'],
      message: 'Invalid category'
    }
  },
  paymentMode: {
    type: String,
    enum: ['cash', 'online', 'upi', 'card'],
    default: 'cash'
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: String,
    default: 'owner'
  }
}, {
  timestamps: true
});

expenseSchema.index({ tenantId: 1, date: -1 });
expenseSchema.index({ tenantId: 1, category: 1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
