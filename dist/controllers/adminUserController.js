"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAdmin = exports.createAdmin = exports.listAdmins = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const AdminUser_1 = __importDefault(require("../models/AdminUser"));
const listAdmins = async (_req, res) => {
    try {
        const admins = await AdminUser_1.default.find();
        res.json(admins.map((a) => a.toJSON()));
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.listAdmins = listAdmins;
const createAdmin = async (req, res) => {
    try {
        const { email, password, display_name, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }
        const existing = await AdminUser_1.default.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: 'An admin with this email already exists.' });
        }
        const hashed = await bcrypt_1.default.hash(password, 10);
        const admin = new AdminUser_1.default({ email, password: hashed, display_name, role: role || 'support' });
        await admin.save();
        res.status(201).json(admin.toJSON());
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createAdmin = createAdmin;
const updateAdmin = async (req, res) => {
    try {
        const { role, is_active, display_name } = req.body;
        const updates = {};
        if (role !== undefined)
            updates.role = role;
        if (is_active !== undefined)
            updates.is_active = is_active;
        if (display_name !== undefined)
            updates.display_name = display_name;
        if (req.params.id === req.admin.id && is_active === false) {
            return res.status(400).json({ message: 'You cannot deactivate your own account.' });
        }
        const admin = await AdminUser_1.default.findByIdAndUpdate(req.params.id, updates);
        if (!admin)
            return res.status(404).json({ message: 'Admin not found.' });
        res.json(admin.toJSON());
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAdmin = updateAdmin;
