import { Router } from 'express';
import { initWalletTopup, verifyPayment, paystackWebhook } from '../controllers/paymentGatewayController';

const router = Router();

// Unauthenticated by necessity: Paystack itself calls verify/webhook, and
// the driver app has no auth layer to attach here either (matching the rest
// of this API's existing posture). Nothing here can credit a wallet without
// a real, Paystack-verified reference. Passengers never pay through the
// app — this is driver wallet top-up only.
router.post('/drivers/:id/wallet/topup/init', initWalletTopup);
router.get('/verify/:reference', verifyPayment);
router.post('/webhook', paystackWebhook);

export default router;
