/**
 * Cricket & Football Module — Registration Entry Point
 *
 * Registers cricket/football-specific controllers with the tenant-aware
 * module dispatcher. Each business type module is now fully self-contained
 * with its own models, controllers, and routes for dues, etc.
 */

import { registerModuleControllers, registerFeatureControllers } from '../../core/services/moduleRegistry.js';
import * as resourceController from './controllers/resourceController.js';
import * as bookingController from './controllers/bookingController.js';
import * as dueController from './controllers/dueController.js';
import * as expenseController from './controllers/expenseController.js';
import * as staffController from './controllers/staffController.js';
import * as paymentController from './controllers/paymentController.js';

export const registerCricketFootballModule = (app) => {
  // Register resource/booking controllers in the tenant-aware dispatcher
  registerModuleControllers('cricket_football', { resourceController, bookingController });

  // Register feature controllers for tenant-aware dispatching
  registerFeatureControllers('cricket_football', {
    dues: dueController,
    expenses: expenseController,
    staff: staffController,
    payments: paymentController
  });
};

export default registerCricketFootballModule;
