import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    role: string;
  };
}

interface AdminTokenPayload {
  id: string;
  role: string;
  // Distinguishes admin tokens from passenger/driver tokens signed with the
  // same JWT_SECRET — without this, a leaked rider/driver token would also
  // pass jwt.verify() here and be treated as an authenticated admin.
  type: 'admin';
}

export const signAdminToken = (id: string, role: string) =>
  jwt.sign({ id, role, type: 'admin' } satisfies AdminTokenPayload, JWT_SECRET, { expiresIn: '7d' });

export const requireAdminAuth = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    if (decoded.type !== 'admin') {
      return res.status(403).json({ message: 'Not an admin token.' });
    }
    req.admin = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireSuperAdmin = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required.' });
  }
  next();
};
