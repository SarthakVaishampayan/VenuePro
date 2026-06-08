import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from './core/config/db.js';
import { logger } from './core/config/logger.js';
import { notFound, globalErrorHandler, setupProcessHandlers, setupGracefulShutdown } from './core/middleware/errorHandler.js';
import { generalLimiter } from './core/middleware/rateLimiter.js';
import { requestIdMiddleware } from './core/middleware/requestId.js';
import { swaggerSpec } from './core/swagger/swaggerConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Nginx reverse proxy (sets X-Forwarded-For)
app.set('trust proxy', 1);

// ============================================================
// SECURITY MIDDLEWARE PIPELINE
// ============================================================
// Order matters: CORS → Helmet → Rate Limit → Request ID → Body Parsers → Sanitize → Morgan → Routes → Error Handler

// 1. CORS — restrict to allowed origins
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id']
}));

// 2. Helmet — secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 3. Rate limiting
app.use('/api/', generalLimiter);

// 4. Request ID for tracing
app.use(requestIdMiddleware);

// 5. Body parsers with size limits
app.use(express.json({ limit: process.env.REQUEST_SIZE_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 6. NoSQL Injection prevention
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('NoSQL injection attempt blocked', {
      requestId: req.id,
      ip: req.ip,
      key
    });
  }
}));

// 7. HTTP request logging (morgan + winston)
app.use(morgan('short', { stream: logger.stream }));

// 8. Disable x-powered-by header
app.disable('x-powered-by');

// ============================================================
// SWAGGER API DOCUMENTATION
// ============================================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'VenuePro SaaS API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true
  }
}));

// Serve raw swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================================
// HEALTH CHECK
// ============================================================

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Check if the server is running
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }
  });
});

// ============================================================
// MODULE REGISTRATION SYSTEM
// ============================================================

export const registerModule = (moduleName, registerFn) => {
  try {
    registerFn(app);
    logger.info(`Module registered: ${moduleName}`);
  } catch (error) {
    logger.error(`Failed to register module ${moduleName}: ${error.message}`);
  }
};

// ============================================================
// PLATFORM ROUTES
// ============================================================

import { router as platformAuthRoutes } from './core/routes/auth.js';
import { router as platformTenantRoutes } from './core/routes/tenants.js';
import { router as platformBusinessTypeRoutes } from './core/routes/businessTypes.js';
import { router as platformSubscriptionRoutes } from './core/routes/subscriptions.js';
import { router as platformRevenueRoutes } from './core/routes/revenue.js';
import { router as platformDashboardRoutes } from './core/routes/dashboard.js';
import { router as platformSupportRoutes } from './core/routes/support.js';
import { router as platformTrialRoutes } from './core/routes/trials.js';
import { router as platformOnboardingRoutes } from './core/routes/onboarding.js';
import { router as platformHelpArticleRoutes } from './core/routes/helpArticles.js';
import { router as platformCustomerRoutes } from './core/routes/customers.js';
import { router as platformSubscriptionManagementRoutes } from './core/routes/subscriptionManagement.js';
import { router as platformTenantBillingRoutes } from './core/routes/tenantBilling.js';

app.use('/api/platform/auth', platformAuthRoutes);
app.use('/api/platform/dashboard', platformDashboardRoutes);
app.use('/api/platform/tenants', platformTenantRoutes);
app.use('/api/platform/customers', platformCustomerRoutes);
app.use('/api/platform/subscriptions', platformSubscriptionManagementRoutes);
app.use('/api/tenant/billing', platformTenantBillingRoutes);
app.use('/api/platform/business-types', platformBusinessTypeRoutes);
app.use('/api/platform/subscription-plans', platformSubscriptionRoutes);
app.use('/api/platform/revenue', platformRevenueRoutes);
app.use('/api/platform/support', platformSupportRoutes);
app.use('/api/platform/trials', platformTrialRoutes);
app.use('/api/platform/onboarding', platformOnboardingRoutes);
app.use('/api/platform/help-articles', platformHelpArticleRoutes);

logger.info('Platform routes registered');

// ============================================================
// MODULE LOADING — Business Type Modules
// ============================================================
// Each module registers its shared routes & resource/booking controllers
// with the tenant-aware dispatcher (see moduleRegistry.js).

import { registerPoolSnookerModule } from './modules/pool-snooker/module.js';
import { registerPickleballModule } from './modules/pickleball/module.js';
import { registerCricketFootballModule } from './modules/cricket-football/module.js';
import { registerGamingZoneModule } from './modules/gaming-zone/module.js';

import { createResourceRoutes, createBookingRoutes } from './core/services/moduleRegistry.js';

registerModule('pool-snooker', registerPoolSnookerModule);
registerModule('pickleball', registerPickleballModule);
registerModule('cricket-football', registerCricketFootballModule);
registerModule('gaming-zone', registerGamingZoneModule);

// ============================================================
// TENANT-AWARE RESOURCE & BOOKING ROUTES
// ============================================================
// These routes dispatch to the correct module's controller
// based on the tenant's business type.

import { tenantAuth } from './core/middleware/auth.js';

const resourceRouter = createResourceRoutes();
const bookingRouter = createBookingRoutes();

app.use('/api/tenant/resources', tenantAuth, resourceRouter);
app.use('/api/tenant/bookings', tenantAuth, bookingRouter);

logger.info('Tenant-aware resource/booking dispatcher registered');

// ============================================================
// TENANT-AWARE FEATURE DISPATCHER — Dues
// ============================================================
// Each business type module has its own due controller with its own
// Due model & collection. The dispatcher resolves the tenant's
// business type and delegates to the correct module's controller.

import { createFeatureDispatcher } from './core/services/moduleRegistry.js';

const dueRouter = createFeatureDispatcher('dues', [
  { method: 'get', path: '/', handler: 'getAllDues' },
  { method: 'get', path: '/:id', handler: 'getDueById' },
  { method: 'post', path: '/', handler: 'createDue' },
  { method: 'post', path: '/:id/pay', handler: 'payDue' },
  { method: 'post', path: '/:id/waive', handler: 'waiveDue' }
]);

app.use('/api/tenant/dues', tenantAuth, dueRouter);

logger.info('Tenant-aware due dispatcher registered');

// ============================================================
// TENANT-AWARE FEATURE DISPATCHER — Expenses, Staff, Payments
// ============================================================
// Each business type module has its own controllers for expenses,
// staff management, and payments. Dispatchers resolve the tenant's
// business type and delegate to the correct module's controllers.

const expenseRouter = createFeatureDispatcher('expenses', [
  { method: 'get', path: '/', handler: 'getAllExpenses' },
  { method: 'get', path: '/analytics', handler: 'getExpenseAnalytics' },
  { method: 'get', path: '/:id', handler: 'getExpenseById' },
  { method: 'post', path: '/', handler: 'createExpense' },
  { method: 'put', path: '/:id', handler: 'updateExpense' },
  { method: 'delete', path: '/:id', handler: 'deleteExpense' }
]);

const staffRouter = createFeatureDispatcher('staff', [
  { method: 'get', path: '/', handler: 'getAllStaff' },
  { method: 'get', path: '/analytics', handler: 'getStaffAnalytics' },
  { method: 'get', path: '/:id', handler: 'getStaffById' },
  { method: 'get', path: '/:id/history', handler: 'getSalaryHistory' },
  { method: 'post', path: '/', handler: 'createStaff' },
  { method: 'put', path: '/:id', handler: 'updateStaff' },
  { method: 'delete', path: '/:id', handler: 'deleteStaff' },
  { method: 'post', path: '/:id/pay', handler: 'paySalary' }
]);

const paymentRouter = createFeatureDispatcher('payments', [
  { method: 'get', path: '/', handler: 'getAllPayments' },
  { method: 'get', path: '/daily-summary', handler: 'getDailySummary' },
  { method: 'post', path: '/', handler: 'recordPayment' }
]);

app.use('/api/tenant/expenses', tenantAuth, expenseRouter);
app.use('/api/tenant/staff', tenantAuth, staffRouter);
app.use('/api/tenant/payments', tenantAuth, paymentRouter);

logger.info('Tenant-aware expense/staff/payment dispatchers registered');

// Staff shift management — uses globally-registered StaffShift model, mounted as shared tenant route
import * as staffShiftController from './modules/pool-snooker/controllers/staffShiftController.js';

const staffShiftRouter = express.Router();
staffShiftRouter.use(tenantAuth);
staffShiftRouter.get('/list', staffShiftController.getShifts);
staffShiftRouter.get('/today', staffShiftController.getTodayShifts);
staffShiftRouter.post('/', staffShiftController.createShift);
staffShiftRouter.patch('/:id/check-in', staffShiftController.checkIn);
staffShiftRouter.patch('/:id/check-out', staffShiftController.checkOut);
staffShiftRouter.put('/:id', staffShiftController.updateShift);
staffShiftRouter.delete('/:id', staffShiftController.deleteShift);

app.use('/api/tenant/staff/shifts', staffShiftRouter);

// ============================================================
// PUBLIC ROUTES (no auth required — landing page, signup, pricing, demo)
// ============================================================

import { router as publicAuthRoutes } from './core/routes/publicAuth.js';
import { router as publicDemoRoutes } from './core/routes/demo.js';
import { router as playerAuthRoutes } from './core/routes/playerAuth.js';
import { router as playerPortalRoutes } from './core/routes/playerPortal.js';
import { tenantRouter as tenantNotificationRoutes, platformRouter as platformNotificationRoutes } from './core/routes/notifications.js';

app.use('/api/public', publicAuthRoutes);
app.use('/api/public/demo', publicDemoRoutes);

// Player Portal routes
app.use('/api/player/auth', playerAuthRoutes);
app.use('/api/player', playerPortalRoutes);

// Notification routes — separate routers for tenant vs super admin
app.use('/api/tenant/notifications', tenantNotificationRoutes);
app.use('/api/platform/notifications', platformNotificationRoutes);

logger.info('Public routes registered (signup, pricing, demo)');
logger.info('Player Portal routes registered');
logger.info('Notification routes registered');

// ============================================================
// CLIENT STATIC FILES (production)
// ============================================================

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
  logger.info(`Serving client from: ${clientDistPath}`);
}

// ============================================================
// ERROR HANDLING (must be LAST)
// ============================================================

app.use(notFound);
app.use(globalErrorHandler);

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();
  
  const server = app.listen(PORT, () => {
    logger.info(`VenuePro Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
    logger.info(`API Docs: http://localhost:${PORT}/api-docs`);
  });
  
  // Start demo cleanup cron (non-blocking)
  try {
    const { startDemoCleanup } = await import('./jobs/demoCleanup.js');
    startDemoCleanup();
  } catch (err) {
    logger.warn(`Demo cleanup cron not started: ${err.message}`);
  }

  // Start trial expiry cron — auto-transition expired trials to overdue
  try {
    const { startTrialExpiryCheck } = await import('./jobs/trialExpiry.js');
    startTrialExpiryCheck();
  } catch (err) {
    logger.warn(`Trial expiry cron not started: ${err.message}`);
  }
  
    // Register event subscribers for notification dispatch
  try {
    const { registerSubscribers } = await import('./core/events/subscribers.js');
    registerSubscribers();
  } catch (err) {
    logger.warn(`Notification subscribers not registered: ${err.message}`);
  }

  // Setup graceful shutdown
  setupGracefulShutdown(server);
};

// Setup process handlers
setupProcessHandlers();

// Start
startServer().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

export default app;
