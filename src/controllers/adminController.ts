import { Request, Response } from 'express';
import Driver from '../models/Driver';
import User from '../models/User';
import { query } from '../db';
import { sendPushToTokens } from '../firebase';

const notifyByTokenColumn = async (table: 'drivers' | 'users', id: string, title: string, body: string, data: Record<string, string>) => {
  try {
    const tokenRow = await query(`SELECT fcm_token FROM ${table} WHERE id = $1 LIMIT 1`, [id]);
    const fcmToken = tokenRow.rows[0]?.fcm_token;
    if (fcmToken) await sendPushToTokens([fcmToken], title, body, data);
  } catch (pushErr) {
    console.warn(`[FCM] ${table} notify error:`, pushErr);
  }
};

export const approveDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const driver = await Driver.findByIdAndUpdate(
      id,
      { verification_status: 'approved' },
      { new: true }
    );

    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    try {
      const tokenRow = await query(`SELECT fcm_token FROM drivers WHERE id = $1 LIMIT 1`, [id]);
      const fcmToken = tokenRow.rows[0]?.fcm_token;
      if (fcmToken) {
        await sendPushToTokens(
          [fcmToken],
          'Account Approved 🎉',
          'Your application has been approved. Fund your wallet to start accepting rides.',
          { type: 'driver_approved' }
        );
      }
    } catch (pushErr) {
      console.warn('[FCM] approveDriver push error:', pushErr);
    }

    res.json({ message: 'Driver approved successfully', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const driver = await Driver.findByIdAndUpdate(
      id,
      { verification_status: 'rejected' },
      { new: true }
    );

    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    res.json({ message: 'Driver rejected', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const suspendDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const driver = await Driver.findByIdAndUpdate(id, { is_active: false }, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    await notifyByTokenColumn('drivers', id, 'Account Suspended',
      'Your account has been suspended. Contact support for more information.', { type: 'driver_suspended' });
    res.json({ message: 'Driver suspended', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const reactivateDriver = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const driver = await Driver.findByIdAndUpdate(id, { is_active: true }, { new: true });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    await notifyByTokenColumn('drivers', id, 'Account Reactivated',
      'Your account has been reactivated. Welcome back!', { type: 'driver_reactivated' });
    res.json({ message: 'Driver reactivated', driver });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const suspendPassenger = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await User.findByIdAndUpdate(id, { is_active: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'Passenger not found' });
    await notifyByTokenColumn('users', id, 'Account Suspended',
      'Your account has been suspended. Contact support for more information.', { type: 'passenger_suspended' });
    res.json({ message: 'Passenger suspended', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const reactivatePassenger = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await User.findByIdAndUpdate(id, { is_active: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'Passenger not found' });
    await notifyByTokenColumn('users', id, 'Account Reactivated',
      'Your account has been reactivated. Welcome back!', { type: 'passenger_reactivated' });
    res.json({ message: 'Passenger reactivated', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
