import { error as errorResponse } from '../utils/responseHelper.js';

// ============================================================
// REQUEST VALIDATION MIDDLEWARE
// ============================================================
// Validates request body, query, or params against a Zod schema

/**
 * Creates a validation middleware for the specified request property
 * @param {'body'|'query'|'params'} property - Request property to validate
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {Object} [options] - Options
 * @param {boolean} [options.stripUnknown=true] - Remove fields not in schema
 * @returns {Function} Express middleware
 */
export const validateRequest = (property = 'body', schema, options = {}) => {
  const { stripUnknown = true } = options;
  
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[property]);
      
      // Replace original with parsed (strips unknown fields, applies defaults)
      if (stripUnknown) {
        req[property] = parsed;
      }
      
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return errorResponse(res, {
          statusCode: 400,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(err);
    }
  };
};

/**
 * Convenience functions
 */
export const validateBody = (schema, options) => validateRequest('body', schema, options);
export const validateQuery = (schema, options) => validateRequest('query', schema, options);
export const validateParams = (schema, options) => validateRequest('params', schema, options);

