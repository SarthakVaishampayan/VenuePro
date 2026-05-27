import express from 'express';
import {
  getAllSessions,
  getActiveSessions,
  getSessionById,
  startSession,
  endSession,
  cancelSession,
  getSessionsByCustomer
} from '../controllers/bookingController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';

const router = express.Router();

router.use(tenantAuth);

router.get('/', getAllSessions);
router.get('/active', getActiveSessions);
router.get('/customer/:customerId', getSessionsByCustomer);
router.get('/:id', getSessionById);
router.post('/start', startSession);
router.put('/:id/end', endSession);
router.put('/:id/cancel', cancelSession);

export default router;
