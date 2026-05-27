import mongoose from 'mongoose';
import { error as errorResponse } from '../utils/responseHelper.js';

// ============================================================
// TENANT ISOLATION MIDDLEWARE
// ============================================================
// Ensures req.tenantId is set from JWT (never from request body)
// This prevents cross-tenant data access

export const tenantIsolation = (req, res, next) => {
  // tenantId MUST come from the authenticated JWT, never from request body/params
  if (!req.user || !req.user.tenantId) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Tenant identification required. Please authenticate.',
      code: 'NO_TENANT'
    });
  }

  // Attach tenantId to request for downstream use
  req.tenantId = req.user.tenantId;

  // Remove tenantId from body/query/params to prevent spoofing
  if (req.body && req.body.tenantId) {
    delete req.body.tenantId;
  }
  if (req.query && req.query.tenantId) {
    delete req.query.tenantId;
  }
  if (req.params && req.params.tenantId) {
    delete req.params.tenantId;
  }

  next();
};

// ============================================================
// VALIDATE MONGOOSE OBJECTID
// ============================================================

export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Missing '${paramName}' parameter.`,
        code: 'MISSING_PARAM'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Invalid '${paramName}' format. Must be a valid ObjectId.`,
        code: 'INVALID_ID'
      });
    }

    next();
  };
};

// ============================================================
// VALIDATE MULTIPLE OBJECTIDS
// ============================================================

export const validateObjectIds = (paramNames = []) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      if (!id) continue;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, {
          statusCode: 400,
          message: `Invalid '${paramName}' format. Must be a valid ObjectId.`,
          code: 'INVALID_ID'
        });
      }
    }
    next();
  };
};

export default { tenantIsolation, validateObjectId, validateObjectIds };
