import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import AdminUser from '../models/AdminUser';
import { signAdminToken, type AdminAuthRequest } from '../middleware/adminAuthMiddleware';

// Creates the first admin account from ADMIN_EMAIL/ADMIN_PASSWORD env vars.
// Only runs if admin_users is empty, so it never overwrites a password
// changed later via changeOwnPassword. Called once at server startup
// (see app.ts) — there is no public account-creation endpoint.
export const seedDefaultAdmin = async () => {
  const existingCount = await AdminUser.count();
  if (existingCount > 0) return;

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('[admin] No admin_users exist and ADMIN_EMAIL/ADMIN_PASSWORD are not set — the admin panel has no login yet.');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = new AdminUser({
    email,
    password: hashed,
    display_name: process.env.ADMIN_NAME || 'Admin',
    role: 'super_admin',
  });
  await admin.save();
  console.log(`[admin] Seeded default super_admin account for ${email}`);
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    const admin = await AdminUser.findOne({ email });
    if (!admin || !admin.is_active) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const matches = await bcrypt.compare(password, admin.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    await AdminUser.findByIdAndUpdate(admin.id!, { last_login: new Date() });
    const token = signAdminToken(admin.id!, admin.role!);
    res.json({ token, admin: admin.toJSON() });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: AdminAuthRequest, res: Response) => {
  try {
    const admin = await AdminUser.findById(req.admin!.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    res.json(admin.toJSON());
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const changeOwnPassword = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }
    const admin = await AdminUser.findById(req.admin!.id);
    if (!admin) return res.status(404).json({ message: 'Admin not found.' });
    const matches = await bcrypt.compare(currentPassword, admin.password);
    if (!matches) return res.status(401).json({ message: 'Current password is incorrect.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await AdminUser.findByIdAndUpdate(admin.id!, { password: hashed });
    res.json({ message: 'Password updated.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

