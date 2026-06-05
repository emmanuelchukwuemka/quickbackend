import { Router } from 'express';
import { getAllDrivers, getDriverById, createDriver, updateDriver, uploadDocuments } from '../controllers/driverController';

const router = Router();

router.get('/', getAllDrivers);
router.get('/:id', getDriverById);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.post('/:id/documents', uploadDocuments);

export default router;
