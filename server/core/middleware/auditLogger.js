import AuditLog from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

// ============================================================
// AUDIT LOGGER MIDDLEWARE
// ============================================================
// Auto-logs CRUD operations. Use as a route handler wrapper.
//
// Usage:
//   router.post('/tenants', auditLogMiddleware('create', 'tenants'), createTenant);
//   router.put('/tenants/:id', auditLogMiddleware('update', 'tenants', { trackChanges: true }), updateTenant);
//

export const auditLogMiddleware = (action, module, options = {}) => {
  const { trackChanges = false, getTargetId = null } = options;

  return async (req, res, next) => {
    // Store original end to capture response
    const originalEnd = res.end;
    let responseBody = null;

    res.end = function (...args) {
      responseBody = args[0] ? args[0].toString() : null;
      originalEnd.apply(this, args);
    };

    // Wait for response
    res.on('finish', async () => {
      try {
        // Only log successful operations (2xx status codes)
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        // Determine target ID if not provided
        let targetId = getTargetId ? getTargetId(req) : (req.params?.id || null);
        let changes = [];

        if (trackChanges && req.method === 'PUT' || trackChanges && req.method === 'PATCH') {
          if (req.originalBody) {
            changes = Object.entries(req.body).map(([field, newValue]) => ({
              field,
              oldValue: req.originalBody[field],
              newValue
            }));
          }
        }

        const logEntry = {
          actorId: req.user?.id || 'system',
          actorRole: req.user?.role || 'system',
          actorName: req.user?.name || 'System',
          tenantId: req.tenantId || req.user?.tenantId || null,
          action,
          module,
          targetId: targetId || null,
          targetModel: options.targetModel || null,
          description: options.description ? options.description(req) : `${action} ${module}`,
          changes,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'] || null,
          requestId: req.id || null,
          outcome: res.statusCode < 400 ? 'success' : 'failure'
        };

        await AuditLog.create(logEntry);
      } catch (error) {
        logger.error('Failed to create audit log:', { error: error.message });
      }
    });

    next();
  };
};

// ============================================================
// MANUAL AUDIT LOG HELPER (for use in controllers)
// ============================================================

export const createAuditLog = async (data) => {
  try {
    return await AuditLog.create(data);
  } catch (error) {
    logger.error('Failed to create audit log:', { error: error.message });
    return null;
  }
};

export default { auditLogMiddleware, createAuditLog };
