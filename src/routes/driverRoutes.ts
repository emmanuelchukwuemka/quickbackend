import { Router } from 'express';
import { getAllDrivers, getDriverById, createDriver, updateDriver, uploadDocuments, saveFcmToken } from '../controllers/driverController';
import { fundDriverWallet, getWalletTransactions } from '../controllers/walletController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';

const router = Router();

router.put('/fcm-token', saveFcmToken);
router.get('/', getAllDrivers);
router.get('/:id', getDriverById);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.post('/:id/documents', uploadDocuments);
// Manual credit — admin-only. Real driver-initiated top-ups go through the
// Paystack flow (see paymentGatewayRoutes.ts), which is unauthenticated by
// necessity (Paystack itself calls the verify/webhook endpoints) but only
// ever credits a wallet after a verified real payment.
router.post('/:id/wallet/topup', requireAdminAuth, fundDriverWallet);
router.get('/:id/wallet/transactions', getWalletTransactions);

export default router;
