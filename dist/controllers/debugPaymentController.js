"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDriverPaymentTransactions = void 0;
const PaymentTransaction_1 = __importDefault(require("../models/PaymentTransaction"));
// TEMPORARY — one-off diagnostic for a real driver's stuck top-up. Remove
// after use.
const listDriverPaymentTransactions = async (req, res) => {
    try {
        const driverRef = req.params.driverId;
        const txns = await PaymentTransaction_1.default.find({ user_ref: driverRef });
        res.json(txns);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listDriverPaymentTransactions = listDriverPaymentTransactions;
