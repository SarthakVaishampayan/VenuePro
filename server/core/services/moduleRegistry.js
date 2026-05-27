/**
 * Module Registry — Tenant-Aware Resource & Booking Dispatcher
 *
 * Maps businessType keys to their respective resource and booking controllers.
 * When a tenant's request hits /api/tenant/resources or /api/tenant/bookings,
 * this dispatcher looks up the tenant's business type and delegates to the
 * correct module's controllers.
 *
 * Also supports generic feature controller dispatching (dues, payments, etc.)
 * so that each business type module can be fully self-contained.
 */

import { Router } from 'express';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import BusinessType from '../models/BusinessType.js';
import { error as errorResponse } from '../utils/responseHelper.js';

// ============================================================
// MODULE REGISTRY — Resource & Booking Controllers
// ============================================================

const resourceControllers = {};
const bookingControllers = {};

/**
 * Register a module's resource and booking controllers for a business type.
 * @param {string} businessTypeKey - e.g. 'pool_snooker', 'pickleball', 'cricket_football', 'gaming_zone'
 * @param {object} controllers
 * @param {object} controllers.resourceController - CRUD controller for resources
 * @param {object} controllers.bookingController - Session/booking controller
 */
export const registerModuleControllers = (businessTypeKey, { resourceController, bookingController }) => {
  if (resourceControllers[businessTypeKey]) {
    console.warn(`[ModuleRegistry] Overwriting existing resource controller for business type: ${businessTypeKey}`);
  }
  resourceControllers[businessTypeKey] = resourceController;
  bookingControllers[businessTypeKey] = bookingController;
};

// ============================================================
// MODULE REGISTRY — Generic Feature Controllers (dues, payments, etc.)
// ============================================================

const featureControllers = {};

/**
 * Register feature controllers for a business type module.
 * Each feature is a route prefix like 'dues', 'payments', 'customers', etc.
 * The controller should expose handler functions matching the route names.
 *
 * @param {string} businessTypeKey - e.g. 'pool_snooker', 'cricket_football'
 * @param {object} features - { dues: dueController, payments: paymentController, ... }
 */
export const registerFeatureControllers = (businessTypeKey, features) => {
  for (const [feature, controller] of Object.entries(features)) {
    if (!featureControllers[feature]) {
      featureControllers[feature] = {};
    }
    if (featureControllers[feature][businessTypeKey]) {
      console.warn(`[ModuleRegistry] Overwriting existing ${feature} controller for business type: ${businessTypeKey}`);
    }
    featureControllers[feature][businessTypeKey] = controller;
  }
};

/**
 * Create a dispatcher router for a specific feature (e.g., 'dues').
 * Routes are defined as [{ method, path, handler }].
 * The dispatcher resolves the tenant's business type and delegates
 * to that module's registered controller.
 */
export const createFeatureDispatcher = (feature, routes) => {
  const router = Router();
  router.use(resolveBusinessType);

  for (const { method, path, handler } of routes) {
    router[method](path, async (req, res, next) => {
      const ctrl = featureControllers[feature]?.[req.businessType];
      if (!ctrl) return moduleNotFound(res, req.businessType);
      if (!ctrl[handler]) {
        return errorResponse(res, {
          statusCode: 500,
          message: `Handler '${handler}' not found in ${feature} controller for ${req.businessType}`,
          code: 'HANDLER_NOT_FOUND'
        });
      }
      return ctrl[handler](req, res, next);
    });
  }

  return router;
};

// ============================================================
// BUSINESS TYPE RESOLVER MIDDLEWARE
// ============================================================

/**
 * Middleware: Attaches req.businessType (the key string like 'pickleball')
 * to the request by looking up the tenant from req.tenantId.
 */
export const resolveBusinessType = async (req, res, next) => {
  try {
    if (!req.tenantId) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Tenant identification required.',
        code: 'NO_TENANT'
      });
    }

    const tenant = await Tenant.findById(req.tenantId).populate('businessTypeId', 'key');
    if (!tenant || !tenant.businessTypeId) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Tenant or business type not found.',
        code: 'TENANT_NOT_FOUND'
      });
    }

    req.businessType = tenant.businessTypeId.key;
    next();
  } catch (err) {
    next(err);
  }
};

// ============================================================
// DISPATCHER ROUTES — Resources & Bookings
// ============================================================

/**
 * Create the resource routes that dispatch to the correct module's controller
 * based on the tenant's resolved business type.
 */
export const createResourceRoutes = () => {
  const router = Router();

  router.use(resolveBusinessType);

  router.get('/', async (req, res, next) => {
    const ctrl = resourceControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.getAllResources(req, res, next);
  });

  router.get('/:id', async (req, res, next) => {
    const ctrl = resourceControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.getResourceById(req, res, next);
  });

  router.post('/', async (req, res, next) => {
    const ctrl = resourceControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.createResource(req, res, next);
  });

  router.put('/:id', async (req, res, next) => {
    const ctrl = resourceControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.updateResource(req, res, next);
  });

  router.patch('/:id/status', async (req, res, next) => {
    const ctrl = resourceControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.toggleResourceStatus(req, res, next);
  });

  router.delete('/:id', async (req, res, next) => {
    const ctrl = resourceControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.deleteResource(req, res, next);
  });

  return router;
};

/**
 * Create the booking routes that dispatch to the correct module's controller
 * based on the tenant's resolved business type.
 */
export const createBookingRoutes = () => {
  const router = Router();

  router.use(resolveBusinessType);

  router.get('/', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.getAllSessions(req, res, next);
  });

  router.get('/active', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.getActiveSessions(req, res, next);
  });

  router.get('/customer/:customerId', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.getSessionsByCustomer(req, res, next);
  });

  router.get('/:id', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.getSessionById(req, res, next);
  });

  router.post('/start', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.startSession(req, res, next);
  });

  router.put('/:id/end', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.endSession(req, res, next);
  });

  router.put('/:id/cancel', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.cancelSession(req, res, next);
  });

  router.put('/:id/timer-expired', async (req, res, next) => {
    const ctrl = bookingControllers[req.businessType];
    if (!ctrl) return moduleNotFound(res, req.businessType);
    return ctrl.timerExpired(req, res, next);
  });

  return router;
};

const moduleNotFound = (res, businessType) => {
  return errorResponse(res, {
    statusCode: 500,
    message: `No module registered for business type: ${businessType}`,
    code: 'MODULE_NOT_FOUND'
  });
};

// ============================================================
// BUSINESS TYPE MODEL RESOLVER
// ============================================================
// Maps each business type to its per-module model names.
// Due, Payment, and BookingSession have separate collections
// per business type; all other models (Expense, StaffUser, etc.)
// are globally registered and shared across tenants.

const businessModelMapping = {
  'pool_snooker': {
    Due: 'Due',
    Payment: 'Payment',
    BookingSession: 'BookingSession'
  },
  'cricket_football': {
    Due: 'CricketFootballDue',
    Payment: 'CricketFootballPayment',
    BookingSession: 'CricketFootballBookingSession'
  },
  pickleball: {
    Due: 'PickleballDue',
    Payment: 'PickleballPayment',
    BookingSession: 'PickleballBookingSession'
  },
  'gaming_zone': {
    Due: 'GamingZoneDue',
    Payment: 'GamingZonePayment',
    BookingSession: 'GamingZoneBookingSession'
  }
};

/**
 * Resolve a mongoose model for a per-module entity by business type.
 *
 * @param {object} req - Express request with req.businessType set
 * @param {'Due'|'Payment'|'BookingSession'} modelName - The logical model name
 * @returns {import('mongoose').Model} The Mongoose model for the tenant's business type
 */
export const getBusinessModel = (req, modelName) => {
  const bt = req.businessType;
  const mapping = businessModelMapping[bt];
  if (!mapping || !mapping[modelName]) {
    throw new Error(`No model mapping for business type "${bt}" and model "${modelName}"`);
  }
  return mongoose.model(mapping[modelName]);
};

// Need mongoose for getBusinessModel
export default { registerModuleControllers, registerFeatureControllers, createFeatureDispatcher, createResourceRoutes, createBookingRoutes, resolveBusinessType, getBusinessModel };
