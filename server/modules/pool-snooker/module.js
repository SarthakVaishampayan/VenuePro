/**
 * Pool & Snooker Module — Registration Entry Point
 *
 * Registers shared routes (auth, dashboard, customers, payments, etc.)
 * and registers its resource/booking controllers with the module registry.
 */
import { registerModuleControllers, registerFeatureControllers } from '../../core/services/moduleRegistry.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import * as expenseController from './controllers/expenseController.js';
import * as staffController from './controllers/staffController.js';
import * as paymentController from './controllers/paymentController.js';
import reportRoutes from './routes/reportRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import branchRoutes from './routes/branchRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

import * as resourceController from './controllers/resourceController.js';
import * as bookingController from './controllers/bookingController.js';
import * as dueController from './controllers/dueController.js';

/**
 * Register all pool & snooker routes with the Express app.
 * @param {import('express').Express} app - Express application instance
 */
export const registerPoolSnookerModule = (app) => {
  // Shared tenant routes (used by all business types)
  app.use('/api/tenant/auth', authRoutes);
  app.use('/api/tenant/dashboard', dashboardRoutes);
  app.use('/api/tenant/customers', customerRoutes);
  app.use('/api/tenant/reports', reportRoutes);
  app.use('/api/tenant/settings', settingRoutes);
  app.use('/api/tenant/branches', branchRoutes);
  app.use('/api/tenant/analytics', analyticsRoutes);

  // Register resource/booking controllers in the tenant-aware dispatcher
  registerModuleControllers('pool_snooker', { resourceController, bookingController });

  // Register feature controllers for tenant-aware dispatching (dues, expenses, staff, payments)
  registerFeatureControllers('pool_snooker', {
    dues: dueController,
    expenses: expenseController,
    staff: staffController,
    payments: paymentController
  });
};

export default registerPoolSnookerModule;
