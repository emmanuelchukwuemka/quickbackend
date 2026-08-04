import { Request, Response } from 'express';
import Driver from '../models/Driver';
import { query } from '../db';
import { sendPushToTokens } from '../firebase';

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
