"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.listNotifications = void 0;
const User_1 = __importDefault(require("../models/User"));
const NotificationLog_1 = __importDefault(require("../models/NotificationLog"));
const firebase_1 = require("../firebase");
const db_1 = require("../db");
const listNotifications = async (_req, res) => {
    try {
        const notifications = await NotificationLog_1.default.find();
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listNotifications = listNotifications;
const sendNotification = async (req, res) => {
    try {
        const { title, body, audience } = req.body;
        if (!title || !body) {
            return res.status(400).json({ message: 'Title and body are required.' });
        }
        if (!['all_drivers', 'all_passengers'].includes(audience)) {
            return res.status(400).json({ message: "Audience must be 'all_drivers' or 'all_passengers'." });
        }
        // Raw query for drivers — the Driver model doesn't map fcm_token through
        // fromRow(), so Driver.find() rows never carry a usable token.
        const tokens = audience === 'all_drivers'
            ? (await (0, db_1.query)(`SELECT fcm_token FROM drivers WHERE fcm_token IS NOT NULL AND fcm_token != ''`)).rows.map((r) => r.fcm_token).filter(Boolean)
            : (await User_1.default.find()).map((r) => r.fcm_token).filter(Boolean);
        await (0, firebase_1.sendPushToTokens)(tokens, title, body);
        const log = new NotificationLog_1.default({
            title,
            body,
            audience,
            recipient_count: tokens.length,
            sent_by: req.admin.id,
        });
        await log.save();
        res.status(201).json({ message: `Sent to ${tokens.length} recipient(s).`, log });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.sendNotification = sendNotification;
