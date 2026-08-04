import { Router } from 'express';
import { listAdminAlerts, markAdminAlertRead, markAllAdminAlertsRead } from '../controllers/adminAlertController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listAdminAlerts);
router.put('/read-all', markAllAdminAlertsRead);
router.put('/:id/read', markAdminAlertRead);

export default router;
