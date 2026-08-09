import PaymentTransaction from '../models/PaymentTransaction';
import { settleReference } from '../controllers/paymentGatewayController';

// Safety net for wallet top-ups: the app's own in-flight polling only waits
// ~2 minutes for a driver to complete checkout in the external browser,
// which real bank card/OTP flows can easily exceed — if the driver comes
// back to the app after the dialog gives up, or never comes back at all,
// nothing else re-checks that payment. This runs independently of the app
// being open and the Paystack webhook being configured, so a genuinely
// successful payment always gets credited eventually, not just when the
// timing happens to line up.
export const reconcilePendingPayments = async () => {
  try {
    const pending = await PaymentTransaction.find({ status: 'pending' });
    for (const txn of pending) {
      try {
        await settleReference(txn.reference);
      } catch (err: any) {
        console.warn(`[PaymentReconciler] failed to settle ${txn.reference}:`, err.message);
      }
    }
  } catch (err: any) {
    console.warn('[PaymentReconciler] run error:', err.message);
  }
};
