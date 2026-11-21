"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackWebhook = exports.verifyPayment = exports.settleReference = exports.initWalletTopup = void 0;
const crypto_1 = __importDefault(require("crypto"));
const PaymentTransaction_1 = __importDefault(require("../models/PaymentTransaction"));
const walletController_1 = require("./walletController");
const paystack_1 = require("../utils/paystack");
const makeReference = (prefix) => `${prefix}_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
// Driver wallet top-up — driver pays Paystack, wallet is only credited once
// the payment is verified (see settleReference below). This is the only
// real-money path in the app: passengers never pay through the app.
const initWalletTopup = async (req, res) => {
    try {
        const driverRef = req.params.id;
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'amount must be a positive number.' });
        }
        const driver = await (0, walletController_1.resolveDriver)(driverRef);
        if (!driver || !driver.id)
            return res.status(404).json({ message: 'Driver not found' });
        const email = driver.email || `driver-${driver.id}@quickdrop.ng`;
        const reference = makeReference('topup');
        await new PaymentTransaction_1.default({
            reference,
            purpose: 'wallet_topup',
            user_ref: driver.id,
            email,
            amount,
        }).save();
        const { authorization_url } = await (0, paystack_1.initializeTransaction)({
            email,
            amountNaira: amount,
            reference,
            metadata: { driver_id: driver.id, purpose: 'wallet_topup' },
            callback_url: req.body.callback_url,
        });
        res.status(201).json({ authorization_url, reference });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.initWalletTopup = initWalletTopup;
// Shared settlement path for the client-triggered verify call, the Paystack
// webhook, and the periodic reconciler (see utils/paymentReconciler.ts).
// Always re-verifies against Paystack's API directly (never trusts a
// client- or webhook-supplied "success" claim at face value), and only
// ever credits the wallet once per reference via
// PaymentTransaction.markSettled's status-guarded UPDATE.
const settleReference = async (reference) => {
    const txn = await PaymentTransaction_1.default.findByReference(reference);
    if (!txn)
        return { found: false };
    if (txn.status !== 'pending')
        return { found: true, txn, alreadySettled: true };
    const verified = await (0, paystack_1.verifyTransaction)(reference);
    const paystackSuccess = verified.status === 'success';
    const settled = await PaymentTransaction_1.default.markSettled(reference, paystackSuccess ? 'success' : 'failed', JSON.stringify(verified));
    if (settled && paystackSuccess) {
        await (0, walletController_1.creditDriverWallet)(txn.user_ref, txn.amount, `Wallet top-up via Paystack (${reference})`, 'paystack');
    }
    const finalTxn = await PaymentTransaction_1.default.findByReference(reference);
    return { found: true, txn: finalTxn, alreadySettled: !settled };
};
exports.settleReference = settleReference;
const verifyPayment = async (req, res) => {
    try {
        const reference = req.params.reference;
        const result = await (0, exports.settleReference)(reference);
        if (!result.found)
            return res.status(404).json({ message: 'Transaction not found' });
        res.json({ status: result.txn.status, purpose: result.txn.purpose, amount: result.txn.amount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.verifyPayment = verifyPayment;
const paystackWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-paystack-signature'];
        const rawBody = req.rawBody;
        if (!rawBody || !(0, paystack_1.verifyWebhookSignature)(rawBody, signature)) {
            return res.status(401).json({ message: 'Invalid signature' });
        }
        const event = req.body;
        if (event?.event === 'charge.success' && event?.data?.reference) {
            await (0, exports.settleReference)(event.data.reference);
        }
        // Always 200 — Paystack retries on non-2xx, and we've already recorded
        // whatever there was to record.
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('[Paystack webhook] error:', error.message);
        res.status(200).json({ received: true });
    }
};
exports.paystackWebhook = paystackWebhook;
