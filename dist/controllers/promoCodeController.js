"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePromoCode = exports.updatePromoCode = exports.createPromoCode = exports.listPromoCodes = void 0;
const PromoCode_1 = __importDefault(require("../models/PromoCode"));
const listPromoCodes = async (_req, res) => {
    try {
        const codes = await PromoCode_1.default.find();
        res.json(codes);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listPromoCodes = listPromoCodes;
const createPromoCode = async (req, res) => {
    try {
        const { code, description, discount_type, discount_value, max_uses, expires_at } = req.body;
        if (!code || !discount_value) {
            return res.status(400).json({ message: 'Code and discount value are required.' });
        }
        const promo = new PromoCode_1.default({ code, description, discount_type, discount_value, max_uses, expires_at });
        await promo.save();
        res.status(201).json(promo);
    }
    catch (error) {
        if (error.message?.includes('Duplicate') || error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A promo code with this code already exists.' });
        }
        res.status(500).json({ message: error.message });
    }
};
exports.createPromoCode = createPromoCode;
const updatePromoCode = async (req, res) => {
    try {
        const { description, discount_type, discount_value, max_uses, expires_at, is_active } = req.body;
        const updates = {};
        if (description !== undefined)
            updates.description = description;
        if (discount_type !== undefined)
            updates.discount_type = discount_type;
        if (discount_value !== undefined)
            updates.discount_value = discount_value;
        if (max_uses !== undefined)
            updates.max_uses = max_uses;
        if (expires_at !== undefined)
            updates.expires_at = expires_at;
        if (is_active !== undefined)
            updates.is_active = is_active;
        const promo = await PromoCode_1.default.findByIdAndUpdate(req.params.id, updates);
        if (!promo)
            return res.status(404).json({ message: 'Promo code not found.' });
        res.json(promo);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updatePromoCode = updatePromoCode;
const deletePromoCode = async (req, res) => {
    try {
        await PromoCode_1.default.deleteOne({ id: req.params.id });
        res.json({ message: 'Promo code deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deletePromoCode = deletePromoCode;
