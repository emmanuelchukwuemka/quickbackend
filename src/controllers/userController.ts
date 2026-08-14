import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import type { AuthRequest } from '../middleware/authMiddleware';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id as string);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updates = req.body;

    // Do not allow updating sensitive fields directly here — this route has
    // no auth, so wallet balance, trip count, and active/suspended status
    // must only ever change via dedicated, admin-gated endpoints.
    delete updates.wallet_balance;
    delete updates.numbe_trips;
    delete updates.is_active;

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Anonymizes the caller's own account rather than deleting the row outright
// — ride records reference passenger_ref by id, and hard-deleting would
// blank out the driver's own trip history for every ride this passenger
// ever took. is_active=false blocks every login path (see authController),
// so the account is permanently inaccessible even though the row remains.
export const deleteOwnAccount = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user!.id;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.findByIdAndUpdate(id, {
      display_name: 'Deleted User',
      email: `deleted-${crypto.randomUUID()}@quickdrop.ng`,
      phone_number: '',
      photo_url: '',
      password: crypto.randomUUID(),
      is_active: false,
    });
    res.json({ message: 'Account deleted.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const saveFcmToken = async (req: Request, res: Response) => {
  try {
    const { user_uid, fcm_token } = req.body;
    if (!user_uid || !fcm_token) {
      return res.status(400).json({ message: 'user_uid and fcm_token are required' });
    }
    const { query } = await import('../db');
    // The app sends whichever id it has on hand (numeric id after most
    // login paths, string uid elsewhere) — match either, same as the
    // lookups in socketManager.ts, or this silently updates 0 rows.
    await query(`UPDATE users SET fcm_token = $1 WHERE uid = $2 OR id::text = $2`, [fcm_token, user_uid]);
    res.json({ message: 'FCM token saved' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
