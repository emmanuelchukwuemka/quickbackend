import { Response } from 'express';
import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

export const listAdmins = async (_req: AdminAuthRequest, res: Response) => {
  try {
    const admins = await AdminUser.find();
    res.json(admins.map((a) => a.toJSON()));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { email, password, display_name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    const existing = await AdminUser.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'An admin with this email already exists.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const admin = new AdminUser({ email, password: hashed, display_name, role: role || 'support' });
    await admin.save();
    res.status(201).json(admin.toJSON());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdmin = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { role, is_active, display_name } = req.body;
    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    if (display_name !== undefined) updates.display_name = display_name;

    if (req.params.id === req.admin!.id && is_active === false) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const admin = await AdminUser.findByIdAndUpdate(req.params.id as string, updates);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    res.json(admin.toJSON());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
