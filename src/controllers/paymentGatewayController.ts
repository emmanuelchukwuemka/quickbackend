import { Request, Response } from 'express';
import crypto from 'crypto';
import PaymentTransaction from '../models/PaymentTransaction';
import { resolveDriver, creditDriverWallet } from './walletController';
import { initializeTransaction, verifyTransaction, verifyWebhookSignature } from '../utils/paystack';

const makeReference = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

// Driver wallet top-up — driver pays Paystack, wallet is only credited once
// the payment is verified (see settleReference below). This is the only
// real-money path in the app: passengers never pay through the app.
export const initWalletTopup = async (req: Request, res: Response) => {
  try {
    const driverRef = req.params.id as string;
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'amount must be a positive number.' });
    }
    const driver = await resolveDriver(driverRef);
    if (!driver || !driver.id) return res.status(404).json({ message: 'Driver not found' });

    const email = driver.email || `driver-${driver.id}@quickdrop.ng`;
    const reference = makeReference('topup');

    await new PaymentTransaction({
      reference,
      purpose: 'wallet_topup',
      user_ref: driver.id,
      email,
      amount,
    }).save();

    const { authorization_url } = await initializeTransaction({
      email,
      amountNaira: amount,
      reference,
      metadata: { driver_id: driver.id, purpose: 'wallet_topup' },
      callback_url: req.body.callback_url,
    });

    res.status(201).json({ authorization_url, reference });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Shared settlement path for both the client-triggered verify call and the
// Paystack webhook. Always re-verifies against Paystack's API directly
// (never trusts a client- or webhook-supplied "success" claim at face
// value), and only ever credits the wallet once per reference via
// PaymentTransaction.markSettled's status-guarded UPDATE.
const settleReference = async (reference: string) => {
  const txn = await PaymentTransaction.findByReference(reference);
  if (!txn) return { found: false as const };
  if (txn.status !== 'pending') return { found: true as const, txn, alreadySettled: true };

  const verified = await verifyTransaction(reference);
  const paystackSuccess = verified.status === 'success';
  const settled = await PaymentTransaction.markSettled(
    reference,
    paystackSuccess ? 'success' : 'failed',
    JSON.stringify(verified)
  );

  if (settled && paystackSuccess) {
    await creditDriverWallet(txn.user_ref, txn.amount, `Wallet top-up via Paystack (${reference})`, 'paystack');
  }

  const finalTxn = await PaymentTransaction.findByReference(reference);
  return { found: true as const, txn: finalTxn!, alreadySettled: !settled };
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const reference = req.params.reference as string;
    const result = await settleReference(reference);
    if (!result.found) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ status: result.txn.status, purpose: result.txn.purpose, amount: result.txn.amount });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const paystackWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const event = req.body;
    if (event?.event === 'charge.success' && event?.data?.reference) {
      await settleReference(event.data.reference);
    }
    // Always 200 — Paystack retries on non-2xx, and we've already recorded
    // whatever there was to record.
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[Paystack webhook] error:', error.message);
    res.status(200).json({ received: true });
  }
};
