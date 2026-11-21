"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Payment_1 = __importDefault(require("../models/Payment"));
const router = (0, express_1.Router)();
// GET user payments
router.get('/user/:userId', async (req, res) => {
    try {
        const payments = await Payment_1.default.find({ user_ref: req.params.userId });
        res.json(payments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// POST new payment method
router.post('/', async (req, res) => {
    try {
        const newPayment = new Payment_1.default(req.body);
        const savedPayment = await newPayment.save();
        res.status(201).json(savedPayment);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.default = router;
