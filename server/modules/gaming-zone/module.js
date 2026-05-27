/**
 * Gaming Zone Module — Registration Entry Point
 *
 * Registers gaming zone-specific resource/booking controllers
 * with the tenant-aware module dispatcher.
 */

import { registerModuleControllers, registerFeatureControllers } from '../../core/services/moduleRegistry.js';
import * as resourceController from './controllers/resourceController.js';
import * as bookingController from './controllers/bookingController.js';
import * as dueController from './controllers/dueController.js';
import * as expenseController from './controllers/expenseController.js';
import * as staffController from './controllers/staffController.js';
import * as paymentController from './controllers/paymentController.js';

export const registerGamingZoneModule = (app) => {
  registerModuleControllers('gaming_zone', { resourceController, bookingController });

  // Register feature controllers for tenant-aware dispatching
  registerFeatureControllers('gaming_zone', {
    dues: dueController,
    expenses: expenseController,
    staff: staffController,
    payments: paymentController
  });
};

export default registerGamingZoneModule;
