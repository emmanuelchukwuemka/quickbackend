import { Router } from 'express';
import {
  createRideOption,
  updateRideOption,
  deleteRideOption,
  createCity,
  deleteCity,
} from '../controllers/settingsController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.use(requireAdminAuth);

router.post('/ride-options', createRideOption);
router.put('/ride-options/:id', updateRideOption);
router.delete('/ride-options/:id', deleteRideOption);

router.post('/cities', createCity);
router.delete('/cities/:id', deleteCity);

export default router;
