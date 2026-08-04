import { Router } from 'express';
import { getAllDrivers, getDriverById, createDriver, updateDriver, uploadDocuments, saveFcmToken } from '../controllers/driverController';
import { fundDriverWallet, getWalletTransactions } from '../controllers/walletController';

const router = Router();

router.put('/fcm-token', saveFcmToken);
router.get('/', getAllDrivers);
router.get('/:id', getDriverById);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.post('/:id/documents', uploadDocuments);
router.post('/:id/wallet/topup', fundDriverWallet);
router.get('/:id/wallet/transactions', getWalletTransactions);

export default router;
