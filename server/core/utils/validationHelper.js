import { z } from 'zod';
import { SYSTEM_CONFIG } from '../config/constants.js';

// ============================================================
// COMMON ZOD SCHEMAS
// ============================================================

// ObjectId validation
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// Email validation
export const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();

// Phone validation (India format)
export const phoneSchema = z.string()
  .regex(/^[+]?[0-9]{10,15}$/, 'Phone must be 10-15 digits, optionally starting with +')
  .transform(val => val.startsWith('+') ? val : `+${val}`);

// Password validation
export const passwordSchema = z.string()
  .min(SYSTEM_CONFIG.PASSWORD_MIN_LENGTH, `Password must be at least ${SYSTEM_CONFIG.PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// URL validation
export const urlSchema = z.string().url('Invalid URL format').optional();

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

// Date range
export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional()
}).refine(data => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
}, { message: 'dateFrom must be before dateTo' });

// Status filter
export const statusFilterSchema = z.object({
  status: z.string().optional()
});

// ============================================================
// BUSINESS TYPE SPECIFIC
// ============================================================

export const pricingRuleSchema = z.object({
  type: z.enum(['weekday', 'weekend', 'peak_hours', 'festival']),
  rate: z.number().positive('Rate must be positive'),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(0).max(23).optional(),
  dates: z.array(z.string().date()).optional()
});

// ============================================================
// VALIDATION MIDDLEWARE HELPER
// ============================================================

export const validate = (schema) => (data) => {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      };
    }
    return { success: false, errors: [{ field: 'unknown', message: error.message }] };
  }
};

