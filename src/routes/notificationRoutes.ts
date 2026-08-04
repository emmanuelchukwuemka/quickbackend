import { Router } from 'express';
import { listNotifications, sendNotification } from '../controllers/notificationController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listNotifications);
router.post('/send', sendNotification);

export default router;
