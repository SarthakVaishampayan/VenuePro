/**
 * Pickleball Module — Registration Entry Point
 *
 * Registers pickleball-specific resource/booking controllers
 * with the tenant-aware module dispatcher.
 */

import { registerModuleControllers, registerFeatureControllers } from '../../core/services/moduleRegistry.js';
import * as resourceController from './controllers/resourceController.js';
import * as bookingController from './controllers/bookingController.js';
import * as dueController from './controllers/dueController.js';
import * as expenseController from './controllers/expenseController.js';
import * as staffController from './controllers/staffController.js';
import * as paymentController from './controllers/paymentController.js';

export const registerPickleballModule = (app) => {
  registerModuleControllers('pickleball', { resourceController, bookingController });

  // Register feature controllers for tenant-aware dispatching
  registerFeatureControllers('pickleball', {
    dues: dueController,
    expenses: expenseController,
    staff: staffController,
    payments: paymentController
  });
};

export default registerPickleballModule;
