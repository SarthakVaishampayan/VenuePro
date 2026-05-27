// ============================================================
// VENUEPRO SAAS — Standardized API Responses
// ============================================================

/**
 * Success response wrapper
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {string} options.message - Success message
 * @param {*} options.data - Response data
 * @param {Object} options.meta - Pagination or metadata
 */
export const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = {
    success: true,
    message,
    data
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Error response wrapper
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {number} options.statusCode - HTTP status code
 * @param {string} options.message - Error message
 * @param {string} options.code - Error code for client handling
 * @param {*} options.errors - Validation errors array
 */
export const error = (res, { statusCode = 500, message = 'Internal server error', code = 'INTERNAL_ERROR', errors = null }) => {
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };
  
  if (errors) {
    response.error.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Pagination meta helper
 */
export const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1
});

/**
 * Created (201) response
 */
export const created = (res, { message = 'Created successfully', data = null }) => {
  return success(res, { statusCode: 201, message, data });
};

/**
 * No content (204) response
 */
export const noContent = (res) => {
  return res.status(204).send();
};

