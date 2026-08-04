import { Router } from 'express';
import { adminLogin, getMe, changeOwnPassword } from '../controllers/adminAuthController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.post('/login', adminLogin);
router.get('/me', requireAdminAuth, getMe);
router.post('/change-password', requireAdminAuth, changeOwnPassword);

export default router;
