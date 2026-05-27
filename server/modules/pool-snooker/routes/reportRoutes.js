import express from 'express';
import {
  getRevenueReport,
  getRevenueTrend,
  getPaymentSplit,
  getResourceUsage,
  getExpenseBreakdown,
  getProfitLoss
} from '../controllers/reportController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { resolveBusinessType } from '../../../core/services/moduleRegistry.js';

const router = express.Router();

router.use(tenantAuth);
router.use(resolveBusinessType);

router.get('/revenue', getRevenueReport);
router.get('/revenue-trend', getRevenueTrend);
router.get('/payment-split', getPaymentSplit);
router.get('/resource-usage', getResourceUsage);
router.get('/expense-breakdown', getExpenseBreakdown);
router.get('/profit-loss', getProfitLoss);

export default router;
