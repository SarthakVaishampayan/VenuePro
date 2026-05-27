import express from 'express';
import {
  getAllResources,
  getResourceById,
  createResource,
  updateResource,
  toggleResourceStatus,
  deleteResource
} from '../controllers/resourceController.js';
import { tenantAuth } from '../../../core/middleware/auth.js';

const router = express.Router();

router.use(tenantAuth);

router.get('/', getAllResources);
router.get('/:id', getResourceById);
router.post('/', createResource);
router.put('/:id', updateResource);
router.patch('/:id/status', toggleResourceStatus);
router.delete('/:id', deleteResource);

export default router;
