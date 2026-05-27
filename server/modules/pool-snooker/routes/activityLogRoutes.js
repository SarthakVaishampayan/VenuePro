import express from 'express';
import { getActivityLogs, getActivityStats } from '../controllers/activityLogController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';

const router = express.Router();

router.use(tenantAuth);

router.get('/', getActivityLogs);
router.get('/stats', getActivityStats);

export default router;
