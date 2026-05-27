import express from 'express';
import {
  getAllCustomers,
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerBookings,
  payCustomerDues,
  getCustomerDues
} from '../controllers/customerController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { resolveBusinessType } from '../../../core/services/moduleRegistry.js';

const router = express.Router();

router.use(tenantAuth);
router.use(resolveBusinessType);

router.get('/', getAllCustomers);
router.get('/search', searchCustomers);
router.get('/:id/bookings', getCustomerBookings);
router.get('/:id/dues', getCustomerDues);
router.post('/:id/pay-dues', payCustomerDues);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
