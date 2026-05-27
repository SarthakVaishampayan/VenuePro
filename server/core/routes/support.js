import express from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validator.js';
import { superAdminAuth, optionalAuth } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/tenantMiddleware.js';
import { auditLogMiddleware } from '../middleware/auditLogger.js';
import { success as successResponse, error as errorResponse, paginationMeta } from '../utils/responseHelper.js';
import PlatformTicket from '../models/PlatformTicket.js';

const router = express.Router();

// ============================================================
// Schemas
// ============================================================

const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(['billing', 'technical', 'feature_request', 'bug_report', 'account', 'other']).default('other'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tenantId: z.string().optional()
});

const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().nullable().optional(),
  resolution: z.string().max(2000).optional()
});

const addMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  isStaffOnly: z.boolean().default(false)
});

// ============================================================
// GET /api/platform/support/stats (MUST be before :id routes)
// ============================================================

/**
 * @swagger
 * /api/platform/support/stats:
 *   get:
 *     tags: [Support]
 *     summary: Support statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Support stats
 */
router.get('/tickets/stats', superAdminAuth, async (req, res, next) => {
  try {
    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      urgentCount
    ] = await Promise.all([
      PlatformTicket.countDocuments(),
      PlatformTicket.countDocuments({ status: 'open' }),
      PlatformTicket.countDocuments({ status: 'in_progress' }),
      PlatformTicket.countDocuments({ status: 'resolved' }),
      PlatformTicket.countDocuments({ status: 'closed' }),
      PlatformTicket.countDocuments({ priority: 'urgent', status: { $ne: 'closed' } })
    ]);

    return successResponse(res, {
      data: {
        total,
        open,
        inProgress,
        resolved,
        closed,
        urgent: urgentCount
      }
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/support/tickets
// ============================================================

/**
 * @swagger
 * /api/platform/support/tickets:
 *   get:
 *     tags: [Support]
 *     summary: List support tickets
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of tickets
 */
router.get('/tickets', superAdminAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const [tickets, total] = await Promise.all([
      PlatformTicket.find(filter)
        .populate('assignedTo', 'name email')
        .sort({ priority: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PlatformTicket.countDocuments(filter)
    ]);

    return successResponse(res, {
      data: tickets,
      meta: paginationMeta(page, limit, total)
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/support/tickets
// ============================================================

/**
 * @swagger
 * /api/platform/support/tickets:
 *   post:
 *     tags: [Support]
 *     summary: Create a support ticket
 *     description: Can be called by authenticated users or optionally by anyone
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Ticket created
 */
router.post('/tickets', optionalAuth, validateBody(createTicketSchema), auditLogMiddleware('create', 'tickets'), async (req, res, next) => {
  try {
    const ticketData = {
      ...req.body,
      createdBy: req.user?.id || req.body.email,
      createdByRole: req.user?.role || 'other',
      createdByName: req.user?.name || req.body.name || 'Anonymous',
      createdByEmail: req.user?.email || req.body.email,
      tenantId: req.body.tenantId || req.user?.tenantId || null
    };

    const ticket = await PlatformTicket.create(ticketData);

    return successResponse(res, {
      statusCode: 201,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/platform/support/tickets/:id
// ============================================================

/**
 * @swagger
 * /api/platform/support/tickets/{id}:
 *   get:
 *     tags: [Support]
 *     summary: Get ticket details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket details
 */
router.get('/tickets/:id', superAdminAuth, validateObjectId('id'), async (req, res, next) => {
  try {
    const ticket = await PlatformTicket.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('closedBy', 'name email');

    if (!ticket) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Ticket not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, { data: ticket });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/platform/support/tickets/:id
// ============================================================

/**
 * @swagger
 * /api/platform/support/tickets/{id}:
 *   patch:
 *     tags: [Support]
 *     summary: Update ticket (status, priority, assignment)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket updated
 */
router.patch('/tickets/:id', superAdminAuth, validateObjectId('id'), validateBody(updateTicketSchema), auditLogMiddleware('update', 'tickets'), async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Auto-set timestamps for status changes
    if (updateData.status === 'resolved') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user.id;
    }
    if (updateData.status === 'closed') {
      updateData.closedAt = new Date();
      updateData.closedBy = req.user.id;
    }

    const ticket = await PlatformTicket.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Ticket not found.',
        code: 'NOT_FOUND'
      });
    }

    return successResponse(res, {
      message: 'Ticket updated successfully',
      data: ticket
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/platform/support/tickets/:id/messages
// ============================================================

/**
 * @swagger
 * /api/platform/support/tickets/{id}/messages:
 *   post:
 *     tags: [Support]
 *     summary: Add message to ticket
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Message added
 */
router.post('/tickets/:id/messages', superAdminAuth, validateObjectId('id'), validateBody(addMessageSchema), async (req, res, next) => {
  try {
    const ticket = await PlatformTicket.findById(req.params.id);
    if (!ticket) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Ticket not found.',
        code: 'NOT_FOUND'
      });
    }

    const message = {
      senderId: req.user.id,
      senderRole: req.user.role,
      senderName: req.user.name || 'Super Admin',
      message: req.body.message,
      isStaffOnly: req.body.isStaffOnly
    };

    ticket.messages.push(message);
    ticket.messageCount = ticket.messages.length;

    // Auto-set first response time
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
      ticket.firstResponseTime = Math.round((ticket.firstResponseAt - ticket.createdAt) / 60000);
    }

    // Auto-assign if unassigned
    if (!ticket.assignedTo) {
      ticket.assignedTo = req.user.id;
      ticket.assignedAt = new Date();
    }

    await ticket.save();

    return successResponse(res, {
      message: 'Message added successfully',
      data: ticket
    });
  } catch (err) {
    next(err);
  }
});

export { router };
export default router;
