import express from 'express';
import {
  getAllDues,
  getDueById,
  createDue,
  payDue,
  waiveDue
} from '../controllers/dueController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';

const router = express.Router();

router.use(tenantAuth);

router.get('/', getAllDues);
router.get('/:id', getDueById);
router.post('/', createDue);
router.post('/:id/pay', payDue);
router.post('/:id/waive', waiveDue);

export default router;
