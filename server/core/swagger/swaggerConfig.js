// ============================================================
// SWAGGER / OPENAPI CONFIGURATION
// ============================================================

import swaggerJsdoc from 'swagger-jsdoc';
import { BUSINESS_TYPES } from '../config/constants.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'VenuePro SaaS API',
    version: '1.0.0',
    description: 'Multi-Tenant Sports Facility Management Platform\n\n## Authentication\n- **Super Admin**: Login at `/api/platform/auth/login`\n- **Tenant Owner**: Login at `/api/tenant/auth/login`\n- **Staff**: Login at `/api/tenant/auth/staff-login`\n\nAll authenticated endpoints require a Bearer token in the `Authorization` header.',
    contact: {
      name: 'VenuePro Support',
      email: 'support@venuepro.com',
      url: 'https://venuepro.com'
    },
    license: {
      name: 'Proprietary',
      url: 'https://venuepro.com/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server'
    },
    {
      url: 'https://api.venuepro.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: `Bearer <token>`'
      }
    },
    schemas: {
      // ============================================================
      // COMMON SCHEMAS
      // ============================================================
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object', nullable: true },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
              hasNextPage: { type: 'boolean' },
              hasPrevPage: { type: 'boolean' }
            }
          }
        }
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      // ============================================================
      // AUTH SCHEMAS
      // ============================================================
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' }
                }
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'string' }
                }
              }
            }
          }
        }
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', format: 'password', minLength: 8 }
        }
      },
      // ============================================================
      // BUSINESS TYPE SCHEMA
      // ============================================================
      BusinessType: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          key: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          labels: {
            type: 'object',
            properties: {
              resourceSingular: { type: 'string' },
              resourcePlural: { type: 'string' },
              bookingSingular: { type: 'string' },
              bookingPlural: { type: 'string' },
              customerSingular: { type: 'string' },
              customerPlural: { type: 'string' }
            }
          },
          pricingStrategy: { type: 'string', enum: ['time_based', 'slot_based', 'configurable'] },
          bookingMode: { type: 'string', enum: ['session', 'slot', 'configurable'] },
          enabledModules: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'inactive', 'development'] }
        }
      },
      // ============================================================
      // TENANT SCHEMA
      // ============================================================
      Tenant: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          businessName: { type: 'string' },
          businessTypeId: { type: 'string' },
          tenantCode: { type: 'string' },
          ownerName: { type: 'string' },
          ownerEmail: { type: 'string' },
          ownerPhone: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              postalCode: { type: 'string' },
              country: { type: 'string' }
            }
          },
          timezone: { type: 'string' },
          currency: { type: 'string' },
          portalStatus: { type: 'string' },
          subscription: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              trialEndsAt: { type: 'string', format: 'date-time' },
              currentPeriodEnd: { type: 'string', format: 'date-time' },
              billingCycle: { type: 'string' }
            }
          }
        }
      },
      // ============================================================
      // SUBSCRIPTION SCHEMAS
      // ============================================================
      SubscriptionPlan: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          key: { type: 'string' },
          description: { type: 'string' },
          prices: {
            type: 'object',
            properties: {
              monthly: { type: 'number' },
              quarterly: { type: 'number' },
              semiAnnual: { type: 'number' },
              yearly: { type: 'number' }
            }
          },
          limits: {
            type: 'object',
            properties: {
              branches: { type: 'integer' },
              resources: { type: 'integer' },
              staff: { type: 'integer' }
            }
          },
          trialDays: { type: 'integer' },
          isActive: { type: 'boolean' }
        }
      },
      // ============================================================
      // SUPPORT TICKET SCHEMA
      // ============================================================
      SupportTicket: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          subject: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          priority: { type: 'string' },
          status: { type: 'string' },
          createdByName: { type: 'string' },
          createdByEmail: { type: 'string' },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                senderName: { type: 'string' },
                message: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 20 },
          sort: { type: 'string' },
          order: { type: 'string', enum: ['asc', 'desc'] }
        }
      }
    },
    // Reusable parameters
    parameters: {
      tenantIdParam: {
        name: 'tenantId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Tenant ID (MongoDB ObjectId)'
      },
      paginationQuery: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', default: 1 },
        description: 'Page number'
      },
      limitQuery: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', default: 20 },
        description: 'Items per page'
      }
    }
  },
  security: [
    { BearerAuth: [] }
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints (login, refresh, logout, forgot password)' },
    { name: 'Super Admin', description: 'Super admin operations' },
    { name: 'Tenants', description: 'Tenant management' },
    { name: 'Business Types', description: 'Business type configuration' },
    { name: 'Subscriptions', description: 'Subscription plan management' },
    { name: 'Dashboard', description: 'Dashboard and analytics' },
    { name: 'Revenue', description: 'Revenue tracking and reporting' },
    { name: 'Support', description: 'Support ticket system' },
    { name: 'System', description: 'System health and configuration' }
  ]
};

const options = {
  swaggerDefinition,
  apis: [
    // Core routes
    './core/routes/*.js',
    // Module routes (future)
    './modules/**/module.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
