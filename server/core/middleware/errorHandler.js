import { logger } from '../config/logger.js';
import { error as errorResponse } from '../utils/responseHelper.js';

// ============================================================
// NOT FOUND HANDLER (404)
// ============================================================

export const notFound = (req, res, next) => {
  const err = new Error(`Not found: ${req.originalUrl}`);
  err.statusCode = 404;
  err.code = 'NOT_FOUND';
  next(err);
};

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

export const globalErrorHandler = (err, req, res, next) => {
  // Set defaults
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';
  
  // Log error (sanitize to avoid leaking sensitive data)
  const logMeta = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    errorCode: err.code,
    statusCode: err.statusCode
  };
  
  if (err.statusCode >= 500) {
    logger.error(`[${err.code}] ${err.message}`, logger.sanitize({ ...logMeta, stack: err.stack }));
  } else {
    logger.warn(`[${err.code}] ${err.message}`, logMeta);
  }
  
  // ============================================================
  // KNOWN ERROR TYPES
  // ============================================================
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.message = 'Validation failed';
    err.errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }
  
  // Mongoose duplicate key
  if (err.code === 11000 || err.code === 11001) {
    err.statusCode = 409;
    err.code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue)[0];
    err.message = `${field} already exists`;
  }
  
  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.code = 'INVALID_ID';
    err.message = `Invalid ${err.path}: ${err.value}`;
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.code = 'INVALID_TOKEN';
    err.message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.code = 'TOKEN_EXPIRED';
    err.message = 'Authentication token expired';
  }
  
  // Zod validation error
  if (err.name === 'ZodError') {
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    err.message = 'Validation failed';
    err.errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }
  
  // Rate limit error
  if (err.name === 'RateLimitError') {
    err.statusCode = 429;
    err.code = 'RATE_LIMIT_EXCEEDED';
    err.message = 'Too many requests, please try again later';
  }
  
  // ============================================================
  // SEND RESPONSE
  // ============================================================
  
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production' && err.statusCode === 500) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
  
  return errorResponse(res, {
    statusCode: err.statusCode,
    message: err.message,
    code: err.code,
    errors: err.errors
  });
};

// ============================================================
// UNHANDLED REJECTIONS & UNCAUGHT EXCEPTIONS
// ============================================================

export const setupProcessHandlers = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason: reason?.message || reason
    });
  });
  
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack
    });
    // Give logger time to flush, then exit
    setTimeout(() => process.exit(1), 1000);
  });
  
  process.on('warning', (warning) => {
    logger.warn('Process warning:', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

export const setupGracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      // Give logger time to flush
      setTimeout(() => process.exit(0), 1000);
    });
    
    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

