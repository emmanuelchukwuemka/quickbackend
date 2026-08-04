import { Router } from 'express';
import { getFareSettings, updateFareSettings } from '../controllers/fareSettingsController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

// GET is public (read by the rider/driver apps); only PUT requires admin auth.
router.get('/', getFareSettings);
router.put('/', requireAdminAuth, updateFareSettings);

export default router;
