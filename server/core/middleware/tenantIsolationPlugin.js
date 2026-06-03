// ============================================================
// TENANT ISOLATION — Mongoose Global Plugin
// ============================================================
// Automatically warns when a tenant-scoped model is queried
// without a `tenantId` filter. Catches accidental data leaks
// during development BEFORE they reach production.
//
// How it works:
//   - Listens to `pre('find')`, `pre('findOne')`, `pre('findOneAndUpdate')`,
//     `pre('findOneAndDelete')`, `pre('countDocuments')`, `pre('aggregate')`
//   - If the model has a `tenantId` field AND the query doesn't filter by it
//   - Logs a warning with stack trace
//
// Models are registered as tenant-scoped by having a `tenantId` path.
// Platform-level models (e.g., SuperAdmin, SubscriptionPlan) are excluded.
// ============================================================

import { logger } from '../config/logger.js';

// Keep track of warned queries to avoid log spam
const warnedQueries = new Set();
const WARN_RESET_INTERVAL = 60 * 1000; // Reset warnings every minute

// Reset warning tracker periodically
setInterval(() => warnedQueries.clear(), WARN_RESET_INTERVAL);

/**
 * List of model names that are PLATFORM-level (not tenant-scoped).
 * These models legitimately query without tenantId filters.
 */
const PLATFORM_MODELS = new Set([
  'SuperAdmin',
  'SubscriptionPlan',
  'BusinessType',
  'PlatformTicket',
  'HelpArticle',
  'AuditLog',
  'Player',        // Player is cross-tenant — players can be linked to multiple tenants
]);

/**
 * Mongoose plugin function.
 * Attach to specific models or use globally.
 */
export function tenantIsolationPlugin(schema, options = {}) {
  // Resolve model name at plugin registration time (may be Unknown if applied globally)
  // We resolve the REAL model name inside each hook at runtime
  const registeredName = options.modelName || schema.options?.modelName || null;

  // Check if this schema has a tenantId field
  const hasTenantId = !!schema.path('tenantId');
  if (!hasTenantId) return;

  // Helper: resolve model name at runtime (inside hooks, this.model is available)
  function resolveModelName(hookThis) {
    // In query hooks, this.model is the Mongoose Model constructor
    // In save hooks, this.constructor is the Model constructor
    const model = hookThis.model || hookThis.constructor;
    if (model && model.modelName) return model.modelName;
    return registeredName || 'Unknown';
  }

  // Queries to intercept
  const queryHooks = ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'countDocuments'];

  for (const hook of queryHooks) {
    schema.pre(hook, function (next) {
      const modelName = resolveModelName(this);

      // Skip platform-level models
      if (PLATFORM_MODELS.has(modelName)) return next();

      const query = this.getQuery();
      const filterTenantId = query.tenantId;

      // Check if tenantId is missing OR is using $exists: false (deliberately skipping)
      const isMissing = !filterTenantId ||
        (typeof filterTenantId === 'object' && filterTenantId.$exists === false);

      if (isMissing) {
        const warnKey = `${modelName}:${hook}`;
        if (!warnedQueries.has(warnKey)) {
          warnedQueries.add(warnKey);
          const stack = new Error().stack?.split('\n').slice(3, 6).join(' → ') || 'unknown';
          logger.warn(`[TENANT-ISOLATION] ${modelName}.${hook}() called WITHOUT tenantId filter!`, {
            model: modelName,
            hook,
            query: JSON.stringify(query),
            caller: stack.trim()
          });
        }
      }
      next();
    });
  }

  // Special handling for aggregate — check first $match stage
  schema.pre('aggregate', function (next) {
    const modelName = resolveModelName(this);
    if (PLATFORM_MODELS.has(modelName)) return next();

    const pipeline = this.pipeline();
    if (pipeline.length > 0 && pipeline[0].$match) {
      const matchStage = pipeline[0].$match;
      if (!matchStage.tenantId) {
        const warnKey = `${modelName}:aggregate`;
        if (!warnedQueries.has(warnKey)) {
          warnedQueries.add(warnKey);
          const stack = new Error().stack?.split('\n').slice(3, 6).join(' → ') || 'unknown';
          logger.warn(`[TENANT-ISOLATION] ${modelName}.aggregate() called WITHOUT tenantId $match!`, {
            model: modelName,
            pipeline: JSON.stringify(pipeline.slice(0, 2)),
            caller: stack.trim()
          });
        }
      }
    }
    next();
  });

  // Protect create/insertMany — tenantId must be in the data
  schema.pre('save', function (next) {
    const modelName = resolveModelName(this);
    if (PLATFORM_MODELS.has(modelName)) return next();

    // If this doc has tenantId path and it's not set, warn
    if (hasTenantId && !this.tenantId) {
      logger.warn(`[TENANT-ISOLATION] ${modelName}.save() called WITHOUT tenantId set!`, {
        model: modelName,
        docId: this._id
      });
    }
    next();
  });
}

export default tenantIsolationPlugin;
