import express from 'express';
import {
  getAllCustomers,
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getCustomerBookings,
  payCustomerDues,
  getCustomerDues
} from '../controllers/customerController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { resolveBusinessType } from '../../../core/services/moduleRegistry.js';
import { error as errorResponse } from '../../../core/utils/responseHelper.js';

const router = express.Router();

router.use(tenantAuth);
router.use(resolveBusinessType);

// Owners can only view players — staff can also create/edit/pay
const ownerReadOnly = (req, res, next) => {
  if (req.user?.role === 'owner_admin') {
    return errorResponse(res, {
      statusCode: 403,
      message: 'Owners can only view players. Ask your staff to create, edit, or manage players.',
      code: 'OWNER_READONLY'
    });
  }
  next();
};

router.get('/', getAllCustomers);
router.get('/search', searchCustomers);
router.get('/:id/bookings', getCustomerBookings);
router.get('/:id/dues', getCustomerDues);
router.post('/:id/pay-dues', payCustomerDues);
router.get('/:id', getCustomerById);
router.post('/', ownerReadOnly, createCustomer);
router.put('/:id', ownerReadOnly, updateCustomer);
// DELETE intentionally removed for all roles

export default router;
