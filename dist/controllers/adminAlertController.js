"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAdminAlertsRead = exports.markAdminAlertRead = exports.listAdminAlerts = void 0;
const AdminNotification_1 = __importDefault(require("../models/AdminNotification"));
// System-generated alerts *to* the admin panel (new driver application,
// etc.) — distinct from notificationController.ts, which sends admin-authored
// messages *to* drivers/passengers.
const listAdminAlerts = async (_req, res) => {
    try {
        const [notifications, unreadCount] = await Promise.all([
            AdminNotification_1.default.find(),
            AdminNotification_1.default.countUnread(),
        ]);
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listAdminAlerts = listAdminAlerts;
const markAdminAlertRead = async (req, res) => {
    try {
        await AdminNotification_1.default.markRead(req.params.id);
        res.json({ message: 'Marked as read.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAdminAlertRead = markAdminAlertRead;
const markAllAdminAlertsRead = async (_req, res) => {
    try {
        await AdminNotification_1.default.markAllRead();
        res.json({ message: 'All alerts marked as read.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAllAdminAlertsRead = markAllAdminAlertsRead;
