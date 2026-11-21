"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactivatePassenger = exports.suspendPassenger = exports.reactivateDriver = exports.suspendDriver = exports.rejectDriver = exports.approveDriver = void 0;
const Driver_1 = __importDefault(require("../models/Driver"));
const User_1 = __importDefault(require("../models/User"));
const db_1 = require("../db");
const firebase_1 = require("../firebase");
const notifyByTokenColumn = async (table, id, title, body, data) => {
    try {
        const tokenRow = await (0, db_1.query)(`SELECT fcm_token FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
        const fcmToken = tokenRow.rows[0]?.fcm_token;
        if (fcmToken)
            await (0, firebase_1.sendPushToTokens)([fcmToken], title, body, data);
    }
    catch (pushErr) {
        console.warn(`[FCM] ${table} notify error:`, pushErr);
    }
};
const approveDriver = async (req, res) => {
    try {
        const id = req.params.id;
        const driver = await Driver_1.default.findByIdAndUpdate(id, { verification_status: 'approved' }, { new: true });
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        try {
            const tokenRow = await (0, db_1.query)(`SELECT fcm_token FROM drivers WHERE id = $1 LIMIT 1`, [id]);
            const fcmToken = tokenRow.rows[0]?.fcm_token;
            if (fcmToken) {
                await (0, firebase_1.sendPushToTokens)([fcmToken], 'Account Approved 🎉', 'Your application has been approved. Fund your wallet to start accepting rides.', { type: 'driver_approved' });
            }
        }
        catch (pushErr) {
            console.warn('[FCM] approveDriver push error:', pushErr);
        }
        res.json({ message: 'Driver approved successfully', driver });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.approveDriver = approveDriver;
const rejectDriver = async (req, res) => {
    try {
        const id = req.params.id;
        const driver = await Driver_1.default.findByIdAndUpdate(id, { verification_status: 'rejected' }, { new: true });
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        res.json({ message: 'Driver rejected', driver });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.rejectDriver = rejectDriver;
const suspendDriver = async (req, res) => {
    try {
        const id = req.params.id;
        const driver = await Driver_1.default.findByIdAndUpdate(id, { is_active: false }, { new: true });
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        await notifyByTokenColumn('drivers', id, 'Account Suspended', 'Your account has been suspended. Contact support for more information.', { type: 'driver_suspended' });
        res.json({ message: 'Driver suspended', driver });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.suspendDriver = suspendDriver;
const reactivateDriver = async (req, res) => {
    try {
        const id = req.params.id;
        const driver = await Driver_1.default.findByIdAndUpdate(id, { is_active: true }, { new: true });
        if (!driver)
            return res.status(404).json({ message: 'Driver not found' });
        await notifyByTokenColumn('drivers', id, 'Account Reactivated', 'Your account has been reactivated. Welcome back!', { type: 'driver_reactivated' });
        res.json({ message: 'Driver reactivated', driver });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.reactivateDriver = reactivateDriver;
const suspendPassenger = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User_1.default.findByIdAndUpdate(id, { is_active: false }, { new: true });
        if (!user)
            return res.status(404).json({ message: 'Passenger not found' });
        await notifyByTokenColumn('users', id, 'Account Suspended', 'Your account has been suspended. Contact support for more information.', { type: 'passenger_suspended' });
        res.json({ message: 'Passenger suspended', user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.suspendPassenger = suspendPassenger;
const reactivatePassenger = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User_1.default.findByIdAndUpdate(id, { is_active: true }, { new: true });
        if (!user)
            return res.status(404).json({ message: 'Passenger not found' });
        await notifyByTokenColumn('users', id, 'Account Reactivated', 'Your account has been reactivated. Welcome back!', { type: 'passenger_reactivated' });
        res.json({ message: 'Passenger reactivated', user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.reactivatePassenger = reactivatePassenger;
