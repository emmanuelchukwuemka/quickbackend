import { Router } from 'express';
import { getAllDrivers, getDriverById, createDriver, updateDriver, deleteDriver, uploadDocuments, saveFcmToken, deleteOwnAccount } from '../controllers/driverController';
import { fundDriverWallet, getWalletTransactions } from '../controllers/walletController';
import { requireAdminAuth } from '../middleware/adminAuthMiddleware';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.put('/fcm-token', saveFcmToken);
// Must come before /:id below — otherwise Express matches "me" as an :id
// and routes it to the admin-only deleteDriver handler instead.
router.delete('/me', verifyToken, deleteOwnAccount);
router.get('/', getAllDrivers);
router.get('/:id', getDriverById);
router.post('/', createDriver);
router.put('/:id', updateDriver);
router.delete('/:id', requireAdminAuth, deleteDriver);
router.post('/:id/documents', uploadDocuments);
// Manual credit — admin-only. Real driver-initiated top-ups go through the
// Paystack flow (see paymentGatewayRoutes.ts), which is unauthenticated by
// necessity (Paystack itself calls the verify/webhook endpoints) but only
// ever credits a wallet after a verified real payment.
router.post('/:id/wallet/topup', requireAdminAuth, fundDriverWallet);
router.get('/:id/wallet/transactions', getWalletTransactions);

export default router;
