import { Router } from 'express';
import { listAdmins, createAdmin, updateAdmin } from '../controllers/adminUserController';
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

router.get('/', listAdmins);
router.post('/', requireSuperAdmin, createAdmin);
router.put('/:id', requireSuperAdmin, updateAdmin);

export default router;
