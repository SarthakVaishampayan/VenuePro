import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  senderRole: {
    type: String,
    enum: ['super_admin', 'owner_admin', 'staff'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 5000
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  isStaffOnly: {
    type: Boolean,
    default: false // Internal notes only visible to super admins
  }
}, { _id: false, timestamps: true });

const platformTicketSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  tenantName: {
    type: String
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    minlength: [5, 'Subject must be at least 5 characters'],
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    enum: ['billing', 'technical', 'feature_request', 'bug_report', 'account', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'],
    default: 'open'
  },
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  createdByRole: {
    type: String,
    enum: ['super_admin', 'owner_admin', 'staff'],
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  createdByEmail: {
    type: String
  },
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    default: null
  },
  assignedAt: Date,
  // Messages
  messages: [ticketMessageSchema],
  messageCount: {
    type: Number,
    default: 0
  },
  // Resolution
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  resolution: {
    type: String,
    maxlength: 2000
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  // SLA
  firstResponseAt: Date,
  firstResponseTime: Number, // Minutes until first response
  resolutionTime: Number // Minutes until resolution
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
platformTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
platformTicketSchema.index({ tenantId: 1, createdAt: -1 });
platformTicketSchema.index({ assignedTo: 1, status: 1 });
platformTicketSchema.index({ createdBy: 1 });
platformTicketSchema.index({ category: 1 });

// Static: get unresolved count
platformTicketSchema.statics.unresolvedCount = async function () {
  return this.countDocuments({ status: { $in: ['open', 'in_progress', 'waiting_on_customer'] } });
};

const PlatformTicket = mongoose.model('PlatformTicket', platformTicketSchema);
export default PlatformTicket;
