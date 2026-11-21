"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFareSettings = exports.getFareSettings = void 0;
const FareSettings_1 = __importDefault(require("../models/FareSettings"));
// Public — the driver and passenger apps need to read the wallet threshold,
// commission rate and fare rates without an admin token.
const getFareSettings = async (_req, res) => {
    try {
        const settings = await FareSettings_1.default.getSettings();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getFareSettings = getFareSettings;
const EDITABLE_FIELDS = [
    'base_fare',
    'price_per_km',
    'standard_multiplier',
    'premium_multiplier',
    'xl_multiplier',
    'wallet_minimum_balance',
    'commission_percent',
];
const updateFareSettings = async (req, res) => {
    try {
        const updates = {};
        for (const field of EDITABLE_FIELDS) {
            if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
                const value = Number(req.body[field]);
                if (!Number.isFinite(value)) {
                    return res.status(400).json({ message: `${field} must be a number.` });
                }
                updates[field] = value;
            }
        }
        const settings = await FareSettings_1.default.updateSettings(updates);
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateFareSettings = updateFareSettings;
