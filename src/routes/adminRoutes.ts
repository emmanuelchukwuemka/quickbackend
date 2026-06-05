import { Router } from 'express';
import { approveDriver, rejectDriver } from '../controllers/adminController';

const router = Router();

// PUT approve a driver
router.put('/driver/:id/approve', approveDriver);

// PUT reject a driver
router.put('/driver/:id/reject', rejectDriver);

export default router;
