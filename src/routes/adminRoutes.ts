import { Router } from 'express';
import { approveDriver, rejectDriver, suspendDriver, reactivateDriver, suspendPassenger, reactivatePassenger } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

// PUT approve a driver
router.put('/driver/:id/approve', approveDriver);

// PUT reject a driver
router.put('/driver/:id/reject', rejectDriver);

// PUT suspend / reactivate a driver
router.put('/driver/:id/suspend', suspendDriver);
router.put('/driver/:id/reactivate', reactivateDriver);

// PUT suspend / reactivate a passenger
router.put('/passenger/:id/suspend', suspendPassenger);
router.put('/passenger/:id/reactivate', reactivatePassenger);

export default router;
