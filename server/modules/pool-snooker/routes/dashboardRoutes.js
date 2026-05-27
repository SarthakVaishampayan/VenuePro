import express from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { resolveBusinessType } from '../../../core/services/moduleRegistry.js';

const router = express.Router();

router.get('/', tenantAuth, resolveBusinessType, getDashboard);

export default router;
