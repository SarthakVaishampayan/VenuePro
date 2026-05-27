import mongoose from 'mongoose';

const helpArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'getting_started', 'bookings', 'payments', 'staff',
      'reports', 'settings', 'troubleshooting', 'billing', 'general'
    ]
  },
  summary: {
    type: String,
    maxlength: [300, 'Summary cannot exceed 300 characters']
  },
  content: {
    type: String,
    required: [true, 'Article content is required'],
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  },
  publishedAt: Date
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes — slug is already indexed via `unique: true`
helpArticleSchema.index({ category: 1, status: 1 });
helpArticleSchema.index({ tags: 1 });
helpArticleSchema.index({ status: 1, sortOrder: 1 });

// Auto-generate slug before validation
helpArticleSchema.pre('validate', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
  next();
});

// Search articles by text
helpArticleSchema.statics.search = function (query, category) {
  const filter = { status: 'published' };
  if (category) filter.category = category;
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: 'i' } },
      { summary: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } }
    ];
  }
  return this.find(filter)
    .select('title slug category summary tags isFeatured sortOrder viewCount createdAt')
    .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
    .lean();
};

const HelpArticle = mongoose.model('HelpArticle', helpArticleSchema);
export default HelpArticle;
