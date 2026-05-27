// ============================================================
// AUDIT SERVICE
// ============================================================
// Centralized audit logging for all platform actions

import AuditLog from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

class AuditService {
  /**
   * Log an action to the audit trail
   * @param {Object} data
   * @param {string} data.actorId - User or system ID
   * @param {string} data.actorRole - super_admin / owner_admin / staff / customer / system
   * @param {string} [data.actorName] - Display name of actor
   * @param {string} [data.tenantId] - Tenant context (null for platform-level)
   * @param {string} data.action - Action type
   * @param {string} data.module - Module name
   * @param {string} [data.targetId] - Target document ID
   * @param {string} [data.targetModel] - Target model name
   * @param {string} [data.description] - Human-readable description
   * @param {Array} [data.changes] - Array of { field, oldValue, newValue }
   * @param {Object} [data.metadata] - Additional data
   * @param {string} [data.ipAddress] - Request IP
   * @param {string} [data.userAgent] - User agent
   * @param {string} [data.requestId] - Request tracing ID
   * @returns {Promise<Object>} Created audit log entry
   */
  async log(data) {
    try {
      return await AuditLog.create({
        actorId: data.actorId,
        actorRole: data.actorRole || 'system',
        actorName: data.actorName || 'System',
        tenantId: data.tenantId || null,
        action: data.action,
        module: data.module,
        targetId: data.targetId || null,
        targetModel: data.targetModel || null,
        description: data.description || `${data.action} in ${data.module}`,
        changes: data.changes || [],
        metadata: data.metadata || {},
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        requestId: data.requestId || null,
        outcome: 'success'
      });
    } catch (error) {
      logger.error('Audit log creation failed:', { error: error.message, data });
      return null;
    }
  }

  /**
   * Log a failed action
   * @param {Object} data - Same as log() plus errorMessage
   * @param {string} data.errorMessage
   * @returns {Promise<Object|null>}
   */
  async logFailure(data) {
    try {
      return await AuditLog.create({
        ...data,
        outcome: 'failure',
        errorMessage: data.errorMessage
      });
    } catch (error) {
      logger.error('Audit log failure creation failed:', { error: error.message });
      return null;
    }
  }

  /**
   * Get audit logs for a tenant
   * @param {string} tenantId
   * @param {Object} filters
   * @param {Object} pagination
   * @returns {Promise<Object>}
   */
  async getTenantLogs(tenantId, filters = {}, pagination = {}) {
    const query = { tenantId };
    if (filters.action) query.action = filters.action;
    if (filters.module) query.module = filters.module;
    if (filters.actorRole) query.actorRole = filters.actorRole;
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const page = parseInt(pagination.page, 10) || 1;
    const limit = parseInt(pagination.limit, 10) || 50;

    const [data, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get platform-wide audit logs
   * @param {Object} filters
   * @param {Object} pagination
   * @returns {Promise<Object>}
   */
  async getPlatformLogs(filters = {}, pagination = {}) {
    const query = {};
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.action) query.action = filters.action;
    if (filters.module) query.module = filters.module;
    if (filters.actorRole) query.actorRole = filters.actorRole;
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const page = parseInt(pagination.page, 10) || 1;
    const limit = parseInt(pagination.limit, 10) || 50;

    const [data, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Clean up old audit logs
   * @param {number} retentionDays - Days to retain (default: 365)
   * @returns {Promise<number>} Number of deleted logs
   */
  async cleanupOldLogs(retentionDays = 365) {
    const result = await AuditLog.cleanupOldLogs(retentionDays);
    logger.info(`Cleaned up ${result.deletedCount} old audit logs`);
    return result.deletedCount;
  }
}

export default new AuditService();
