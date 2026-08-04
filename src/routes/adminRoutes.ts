import { Router } from 'express';
import { approveDriver, rejectDriver } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

// PUT approve a driver
router.put('/driver/:id/approve', approveDriver);

// PUT reject a driver
router.put('/driver/:id/reject', rejectDriver);

export default router;
