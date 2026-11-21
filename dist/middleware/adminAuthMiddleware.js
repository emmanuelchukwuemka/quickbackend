"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdminAuth = exports.signAdminToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
const signAdminToken = (id, role) => jsonwebtoken_1.default.sign({ id, role, type: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
exports.signAdminToken = signAdminToken;
const requireAdminAuth = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.type !== 'admin') {
            return res.status(403).json({ message: 'Not an admin token.' });
        }
        req.admin = { id: decoded.id, role: decoded.role };
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid or expired token.' });
    }
};
exports.requireAdminAuth = requireAdminAuth;
const requireSuperAdmin = (req, res, next) => {
    if (req.admin?.role !== 'super_admin') {
        return res.status(403).json({ message: 'Super admin access required.' });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
