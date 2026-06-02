import { verifyAccessToken, isTokenBlacklisted } from '../utils/jwtHelper.js';
import { error as errorResponse } from '../utils/responseHelper.js';
import SuperAdmin from '../models/SuperAdmin.js';
import Tenant from '../models/Tenant.js';
import OwnerUser from '../../modules/pool-snooker/models/OwnerUser.js';
import StaffUser from '../../modules/pool-snooker/models/StaffUser.js';

// ============================================================
// EXTRACT TOKEN FROM REQUEST
// ============================================================

const extractToken = (req) => {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  // Fall back to cookie
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
};

// ============================================================
// VERIFY TOKEN MIDDLEWARE
// ============================================================

const verifyToken = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Authentication required. No token provided.',
      code: 'NO_TOKEN'
    });
  }

  // Check if token is blacklisted (logged out)
  if (isTokenBlacklisted(token)) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Token has been invalidated. Please login again.',
      code: 'TOKEN_BLACKLISTED'
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.message === 'Access token expired') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Access token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return errorResponse(res, {
      statusCode: 401,
      message: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
};

// ============================================================
// SUPER ADMIN AUTH
// ============================================================

export const superAdminAuth = async (req, res, next) => {
  // First verify the token
  verifyToken(req, res, async (err) => {
    if (err) return next(err);

    // Check role
    if (req.user.role !== 'super_admin') {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Access denied. Super admin privileges required.',
        code: 'FORBIDDEN'
      });
    }

    // Verify admin still exists and is active
    try {
      const admin = await SuperAdmin.findById(req.user.id).select('isActive lockedUntil');
      if (!admin) {
        return errorResponse(res, {
          statusCode: 401,
          message: 'Admin account not found.',
          code: 'ACCOUNT_NOT_FOUND'
        });
      }
      if (!admin.isActive) {
        return errorResponse(res, {
          statusCode: 403,
          message: 'Admin account has been deactivated.',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }
      if (admin.lockedUntil && admin.lockedUntil > new Date()) {
        return errorResponse(res, {
          statusCode: 423,
          message: 'Account is temporarily locked due to multiple failed attempts.',
          code: 'ACCOUNT_LOCKED'
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  });
};

// ============================================================
// TENANT AUTH (owner admin)
// ============================================================

export const tenantAuth = async (req, res, next) => {
  verifyToken(req, res, async (err) => {
    if (err) return next(err);

    if (!['owner_admin', 'staff'].includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Access denied. Owner or staff privileges required.',
        code: 'FORBIDDEN'
      });
    }

    // Set tenantId from JWT for downstream use
    req.tenantId = req.user.tenantId;

    // Verify tenant exists and is active
    try {
      const tenant = await Tenant.findById(req.tenantId).select('portalStatus isActive subscription.status');
      if (!tenant) {
        return errorResponse(res, {
          statusCode: 404,
          message: 'Tenant not found.',
          code: 'TENANT_NOT_FOUND'
        });
      }
      if (!tenant.isActive || tenant.portalStatus === 'disabled') {
        return errorResponse(res, {
          statusCode: 403,
          message: 'Tenant account has been deactivated.',
          code: 'TENANT_DEACTIVATED'
        });
      }
      if (tenant.portalStatus === 'suspended') {
        return errorResponse(res, {
          statusCode: 403,
          message: 'Tenant access suspended due to subscription issues. Please contact support.',
          code: 'TENANT_SUSPENDED'
        });
      }

      // Also verify the specific user (OwnerUser/StaffUser) still exists and is active
      let userRecord = null;
      if (req.user.role === 'owner_admin') {
        userRecord = await OwnerUser.findById(req.user.id).select('isActive');
      } else if (req.user.role === 'staff') {
        userRecord = await StaffUser.findById(req.user.id).select('isActive');
      }

      if (!userRecord) {
        return errorResponse(res, {
          statusCode: 401,
          message: 'User account no longer exists.',
          code: 'USER_DELETED'
        });
      }

      if (!userRecord.isActive) {
        return errorResponse(res, {
          statusCode: 403,
          message: 'User account has been deactivated.',
          code: 'USER_DEACTIVATED'
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  });
};

// ============================================================
// STAFF AUTH
// ============================================================

export const staffAuth = async (req, res, next) => {
  verifyToken(req, res, async (err) => {
    if (err) return next(err);

    if (!['owner_admin', 'staff'].includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Access denied. Staff privileges required.',
        code: 'FORBIDDEN'
      });
    }

    // Set tenantId from JWT for downstream use
    req.tenantId = req.user.tenantId;

    // Verify tenant is still active
    try {
      const tenant = await Tenant.findById(req.tenantId).select('portalStatus isActive');
      if (!tenant || !tenant.isActive || tenant.portalStatus !== 'active') {
        return errorResponse(res, {
          statusCode: 403,
          message: 'Tenant access is not active.',
          code: 'TENANT_DEACTIVATED'
        });
      }

      // Also verify the specific user still exists and is active
      let userRecord = null;
      if (req.user.role === 'staff') {
        userRecord = await StaffUser.findById(req.user.id).select('isActive');
      } else if (req.user.role === 'owner_admin') {
        userRecord = await OwnerUser.findById(req.user.id).select('isActive');
      }
      if (!userRecord) {
        return errorResponse(res, {
          statusCode: 401,
          message: 'User account no longer exists.',
          code: 'USER_DELETED'
        });
      }
      if (!userRecord.isActive) {
        return errorResponse(res, {
          statusCode: 403,
          message: 'User account has been deactivated.',
          code: 'USER_DEACTIVATED'
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  });
};

// ============================================================
// OPTIONAL AUTH (attaches user if token present, but doesn't block)
// ============================================================

export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  if (isTokenBlacklisted(token)) return next();

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
  } catch (err) {
    // Token invalid or expired — just continue without user
  }
  next();
};

// ============================================================
// PERMISSION CHECKER (for granular staff permissions)
// ============================================================

export const requirePermission = (permission) => {
  return (req, res, next) => {
    // Super admin and owner admin have all permissions
    if (['super_admin', 'owner_admin'].includes(req.user.role)) {
      return next();
    }

    // Staff must have the specific permission
    if (req.user.permissions && req.user.permissions.includes(permission)) {
      return next();
    }

    return errorResponse(res, {
      statusCode: 403,
      message: `Access denied. Requires '${permission}' permission.`,
      code: 'FORBIDDEN'
    });
  };
};

export default { superAdminAuth, tenantAuth, staffAuth, optionalAuth, requirePermission };
