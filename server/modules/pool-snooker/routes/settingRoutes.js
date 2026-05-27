import express from 'express';
import { getAllSettings, updateSetting, bulkUpdateSettings } from '../controllers/settingController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';

const router = express.Router();

router.use(tenantAuth);

router.get('/', getAllSettings);
router.put('/', updateSetting);
router.put('/bulk', bulkUpdateSettings);

export default router;
