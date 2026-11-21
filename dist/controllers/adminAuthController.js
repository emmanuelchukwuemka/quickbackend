"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeOwnPassword = exports.getMe = exports.adminLogin = exports.seedDefaultAdmin = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const AdminUser_1 = __importDefault(require("../models/AdminUser"));
const adminAuthMiddleware_1 = require("../middleware/adminAuthMiddleware");
// Creates the first admin account from ADMIN_EMAIL/ADMIN_PASSWORD env vars.
// Only runs if admin_users is empty, so it never overwrites a password
// changed later via changeOwnPassword. Called once at server startup
// (see app.ts) — there is no public account-creation endpoint.
const seedDefaultAdmin = async () => {
    const existingCount = await AdminUser_1.default.count();
    if (existingCount > 0)
        return;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        console.warn('[admin] No admin_users exist and ADMIN_EMAIL/ADMIN_PASSWORD are not set — the admin panel has no login yet.');
        return;
    }
    const hashed = await bcrypt_1.default.hash(password, 10);
    const admin = new AdminUser_1.default({
        email,
        password: hashed,
        display_name: process.env.ADMIN_NAME || 'Admin',
        role: 'super_admin',
    });
    await admin.save();
    console.log(`[admin] Seeded default super_admin account for ${email}`);
};
exports.seedDefaultAdmin = seedDefaultAdmin;
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const admin = await AdminUser_1.default.findOne({ email });
        if (!admin || !admin.is_active) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        const matches = await bcrypt_1.default.compare(password, admin.password);
        if (!matches) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        await AdminUser_1.default.findByIdAndUpdate(admin.id, { last_login: new Date() });
        const token = (0, adminAuthMiddleware_1.signAdminToken)(admin.id, admin.role);
        res.json({ token, admin: admin.toJSON() });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.adminLogin = adminLogin;
const getMe = async (req, res) => {
    try {
        const admin = await AdminUser_1.default.findById(req.admin.id);
        if (!admin)
            return res.status(404).json({ message: 'Admin not found.' });
        res.json(admin.toJSON());
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMe = getMe;
const changeOwnPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters.' });
        }
        const admin = await AdminUser_1.default.findById(req.admin.id);
        if (!admin)
            return res.status(404).json({ message: 'Admin not found.' });
        const matches = await bcrypt_1.default.compare(currentPassword, admin.password);
        if (!matches)
            return res.status(401).json({ message: 'Current password is incorrect.' });
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        await AdminUser_1.default.findByIdAndUpdate(admin.id, { password: hashed });
        res.json({ message: 'Password updated.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.changeOwnPassword = changeOwnPassword;
