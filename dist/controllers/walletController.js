"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletSummary = exports.getWalletTransactions = exports.fundDriverWallet = exports.creditDriverWallet = exports.resolveDriver = void 0;
const Driver_1 = __importDefault(require("../models/Driver"));
const WalletTransaction_1 = __importDefault(require("../models/WalletTransaction"));
const resolveDriver = (driverRef) => Driver_1.default.findOne({ $or: [{ id: driverRef }, { uid: driverRef }] });
exports.resolveDriver = resolveDriver;
// Atomic credit, shared by the admin manual-credit endpoint and the real
// Paystack payment flow once a transaction is verified. Returns the new
// balance.
const creditDriverWallet = async (driverId, amount, note, createdBy) => {
    const updatedDriver = await Driver_1.default.findByIdAndUpdate(driverId, { $inc: { wallet_balance: amount } }, { new: true });
    const balanceAfter = updatedDriver?.wallet_balance ?? 0;
    await new WalletTransaction_1.default({
        driver_ref: driverId,
        type: 'topup',
        amount,
        balance_after: balanceAfter,
        note,
        created_by: createdBy,
    }).save();
    return balanceAfter;
};
exports.creditDriverWallet = creditDriverWallet;
// Admin-only manual wallet credit (goodwill credits, refunds, support cases)
// — real driver-initiated top-ups now go through the Paystack flow in
// paymentGatewayController.ts. Gated by requireAdminAuth at the route level.
const fundDriverWallet = async (req, res) => {
    try {
        const driverRef = req.params.id;
        const amount = Number(req.body.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'amount must be a positive number.' });
        }
        const driver = await (0, exports.resolveDriver)(driverRef);
        if (!driver || !driver.id)
            return res.status(404).json({ message: 'Driver not found' });
        const balanceAfter = await (0, exports.creditDriverWallet)(driver.id, amount, 'Manual admin credit', 'admin');
        res.json({ wallet_balance: balanceAfter });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.fundDriverWallet = fundDriverWallet;
const getWalletTransactions = async (req, res) => {
    try {
        const driverRef = req.params.id;
        const driver = await (0, exports.resolveDriver)(driverRef);
        const key = driver?.id ?? driverRef;
        const transactions = await WalletTransaction_1.default.findByDriver(key);
        res.json(transactions);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getWalletTransactions = getWalletTransactions;
// Admin-only, platform-wide view — total commission earned, total driver
// top-ups, and a daily-bucketed window for charting. Gated by
// requireAdminAuth at the route level.
const getWalletSummary = async (_req, res) => {
    try {
        const totals = await WalletTransaction_1.default.sumByType();
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const recent = await WalletTransaction_1.default.findSince(since);
        res.json({ totals, recent });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getWalletSummary = getWalletSummary;
