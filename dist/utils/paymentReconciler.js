"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePendingPayments = void 0;
const PaymentTransaction_1 = __importDefault(require("../models/PaymentTransaction"));
const paymentGatewayController_1 = require("../controllers/paymentGatewayController");
// Safety net for wallet top-ups: the app's own in-flight polling only waits
// ~2 minutes for a driver to complete checkout in the external browser,
// which real bank card/OTP flows can easily exceed — if the driver comes
// back to the app after the dialog gives up, or never comes back at all,
// nothing else re-checks that payment. This runs independently of the app
// being open and the Paystack webhook being configured, so a genuinely
// successful payment always gets credited eventually, not just when the
// timing happens to line up.
const reconcilePendingPayments = async () => {
    try {
        const pending = await PaymentTransaction_1.default.find({ status: 'pending' });
        for (const txn of pending) {
            try {
                await (0, paymentGatewayController_1.settleReference)(txn.reference);
            }
            catch (err) {
                console.warn(`[PaymentReconciler] failed to settle ${txn.reference}:`, err.message);
            }
        }
    }
    catch (err) {
        console.warn('[PaymentReconciler] run error:', err.message);
    }
};
exports.reconcilePendingPayments = reconcilePendingPayments;
