"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const AdminUser_1 = __importDefault(require("../models/AdminUser"));
// TEMPORARY diagnostic route — remove after use.
const router = (0, express_1.Router)();
const TOKEN = 'qd-diag-6f3a1c9e-2026';
router.get('/check', async (req, res) => {
    if (req.query.token !== TOKEN)
        return res.status(404).end();
    const admins = await AdminUser_1.default.find();
    res.json({
        count: admins.length,
        admins: admins.map((a) => ({
            id: a.id,
            email: a.email,
            role: a.role,
            is_active: a.is_active,
            created_at: a.created_at,
            last_login: a.last_login,
        })),
    });
});
router.post('/fix', async (req, res) => {
    if (req.query.token !== TOKEN)
        return res.status(404).end();
    const { email, password } = req.body || {};
    if (!email || !password)
        return res.status(400).json({ message: 'email and password required' });
    const hashed = await bcrypt_1.default.hash(password, 10);
    const existing = await AdminUser_1.default.findOne({ email });
    if (existing) {
        await AdminUser_1.default.findByIdAndUpdate(existing.id, { password: hashed, is_active: true });
        return res.json({ action: 'updated', id: existing.id });
    }
    const admin = new AdminUser_1.default({ email, password: hashed, display_name: 'Admin', role: 'super_admin' });
    await admin.save();
    res.json({ action: 'created', id: admin.id });
});
exports.default = router;
