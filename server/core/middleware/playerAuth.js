import { verifyAccessToken, isTokenBlacklisted } from '../utils/jwtHelper.js';
import { error as errorResponse } from '../utils/responseHelper.js';

// ============================================================
// EXTRACT TOKEN FROM REQUEST
// ============================================================

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

// ============================================================
// PLAYER AUTH
// ============================================================

export const playerAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Authentication required. Please login.',
      code: 'NO_TOKEN'
    });
  }

  if (isTokenBlacklisted(token)) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Token has been invalidated. Please login again.',
      code: 'TOKEN_BLACKLISTED'
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    if (decoded.role !== 'player') {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Access denied. Player privileges required.',
        code: 'FORBIDDEN'
      });
    }
    req.player = decoded;
    req.playerId = decoded.id;
    next();
  } catch (err) {
    if (err.message === 'Access token expired') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Session expired. Please login again.',
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
// OPTIONAL PLAYER AUTH (attaches player if token present)
// ============================================================

export const optionalPlayerAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  if (isTokenBlacklisted(token)) return next();

  try {
    const decoded = verifyAccessToken(token);
    if (decoded.role === 'player') {
      req.player = decoded;
      req.playerId = decoded.id;
    }
  } catch (err) {
    // Token invalid or expired — just continue without player
  }
  next();
};

export default { playerAuth, optionalPlayerAuth };
