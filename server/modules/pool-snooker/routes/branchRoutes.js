import express from 'express';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchDashboard
} from '../controllers/branchController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';
import { resolveBusinessType } from '../../../core/services/moduleRegistry.js';

const router = express.Router();

router.use(tenantAuth);
router.use(resolveBusinessType);

router.get('/', getAllBranches);
router.get('/dashboard', getBranchDashboard);
router.get('/:id', getBranchById);
router.post('/', createBranch);
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

export default router;
