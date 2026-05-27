import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validator.js';
import { superAdminAuth } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/tenantMiddleware.js';
import { auditLogMiddleware } from '../middleware/auditLogger.js';
import { success as successResponse, error as errorResponse, paginationMeta } from '../utils/responseHelper.js';
import HelpArticle from '../models/HelpArticle.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const createArticleSchema = z.object({
  title: z.string().min(5).max(200),
  category: z.enum([
    'getting_started', 'bookings', 'payments', 'staff',
    'reports', 'settings', 'troubleshooting', 'billing', 'general'
  ]),
  summary: z.string().max(300).optional(),
  content: z.string().min(10).max(50000),
  tags: z.array(z.string().trim().toLowerCase()).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});

const updateArticleSchema = createArticleSchema.partial();

// ============================================================
// GET /api/platform/help-articles
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles:
 *   get:
 *     tags: [Knowledge Base]
 *     summary: List all help articles (super admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of articles
 */
router.get('/', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const [articles, total] = await Promise.all([
      HelpArticle.find(filter)
        .select('-content')
        .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HelpArticle.countDocuments(filter)
    ]);

    return successResponse(res, {
      data: articles,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/help-articles/search
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles/search:
 *   get:
 *     tags: [Knowledge Base]
 *     summary: Search published articles (public)
 *     description: No auth required — used by owners and staff
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Matching articles
 */
router.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    const category = req.query.category || '';
    const articles = await HelpArticle.search(query, category);

    return successResponse(res, { data: articles });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/help-articles/categories
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles/categories:
 *   get:
 *     tags: [Knowledge Base]
 *     summary: Get article group by category (public)
 *     responses:
 *       200:
 *         description: Articles by category
 */
router.get('/categories', async (req, res, next) => {
  try {
    const articles = await HelpArticle.find({ status: 'published' })
      .select('title slug category summary isFeatured sortOrder')
      .sort({ isFeatured: -1, sortOrder: 1 })
      .lean();

    // Group by category
    const grouped = articles.reduce((acc, article) => {
      const category = article.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(article);
      return acc;
    }, {});

    return successResponse(res, { data: grouped });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/help-articles/:id
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles/{id}:
 *   get:
 *     tags: [Knowledge Base]
 *     summary: Get article by ID or slug
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Article details
 */
router.get('/:id', async (req, res, next) => {
  try {
    // Find by slug or by ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    let article;

    if (isObjectId) {
      article = await HelpArticle.findById(req.params.id).lean();
    } else {
      article = await HelpArticle.findOne({ slug: req.params.id, status: 'published' }).lean();
    }

    if (!article) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Article not found.',
        code: 'NOT_FOUND'
      });
    }

    // Increment view count (fire and forget)
    HelpArticle.findByIdAndUpdate(article._id, { $inc: { viewCount: 1 } }).catch(() => {});

    return successResponse(res, { data: article });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/help-articles
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles:
 *   post:
 *     tags: [Knowledge Base]
 *     summary: Create help article
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Article created
 */
router.post('/', superAdminAuth, validateBody(createArticleSchema), auditLogMiddleware('create', 'help_articles'), async (req, res, next) => {
  try {
    const articleData = {
      ...req.body,
      createdBy: req.user.id,
      publishedAt: req.body.status === 'published' ? new Date() : null
    };

    const article = await HelpArticle.create(articleData);

    return successResponse(res, {
      statusCode: 201,
      message: 'Help article created successfully',
      data: article
    });
  } catch (err) {
    if (err.code === 11000) {
      return errorResponse(res, {
        statusCode: 409,
        message: 'An article with this slug already exists.',
        code: 'DUPLICATE_SLUG'
      });
    }
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/help-articles/:id
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles/{id}:
 *   patch:
 *     tags: [Knowledge Base]
 *     summary: Update help article
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Article updated
 */
router.patch('/:id', superAdminAuth, validateObjectId('id'), validateBody(updateArticleSchema), auditLogMiddleware('update', 'help_articles'), async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Set published date when status changes to published
    if (req.body.status === 'published') {
      updateData.publishedAt = new Date();
    }

    const article = await HelpArticle.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!article) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Article not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Article updated successfully',
      data: article
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/help-articles/:id/feedback
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles/{id}/feedback:
 *   post:
 *     tags: [Knowledge Base]
 *     summary: Submit article feedback (helpful/not helpful)
 *     responses:
 *       200:
 *         description: Feedback recorded
 */
router.post('/:id/feedback', async (req, res, next) => {
  try {
    const { helpful } = req.body;
    if (helpful === true) {
      await HelpArticle.findByIdAndUpdate(req.params.id, { $inc: { helpfulCount: 1 } });
    } else {
      await HelpArticle.findByIdAndUpdate(req.params.id, { $inc: { notHelpfulCount: 1 } });
    }

    return successResponse(res, { message: 'Feedback recorded' });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /api/platform/help-articles/:id
// ============================================================

/**
 * @swagger
 * /api/platform/help-articles/{id}:
 *   delete:
 *     tags: [Knowledge Base]
 *     summary: Delete help article
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Article deleted
 */
router.delete('/:id', superAdminAuth, validateObjectId('id'), auditLogMiddleware('delete', 'help_articles'), async (req, res, next) => {
  try {
    const article = await HelpArticle.findByIdAndDelete(req.params.id);
    if (!article) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Article not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Article deleted successfully'
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
