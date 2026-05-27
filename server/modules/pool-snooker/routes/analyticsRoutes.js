import express from 'express';
import {
  getCustomerLifetimeValue,
  getPeakHours,
  getResourceHeatmap,
  getStaffPerformance,
  getProfitLossByBranch,
  getCustomRangeAnalytics,
  exportCSV
} from '../controllers/advancedAnalyticsController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { resolveBusinessType } from '../../../core/services/moduleRegistry.js';

const router = express.Router();

router.use(tenantAuth);
router.use(resolveBusinessType);

router.get('/customer-lifetime-value', getCustomerLifetimeValue);
router.get('/peak-hours', getPeakHours);
router.get('/resource-heatmap', getResourceHeatmap);
router.get('/staff-performance', getStaffPerformance);
router.get('/profit-loss-by-branch', getProfitLossByBranch);
router.get('/custom-range', getCustomRangeAnalytics);
router.get('/export-csv', exportCSV);

export default router;
