import { Response } from 'express';
import User from '../models/User';
import NotificationLog from '../models/NotificationLog';
import { sendPushToTokens } from '../firebase';
import { query } from '../db';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

export const listNotifications = async (_req: AdminAuthRequest, res: Response) => {
  try {
    const notifications = await NotificationLog.find();
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const sendNotification = async (req: AdminAuthRequest, res: Response) => {
  try {
    const { title, body, audience } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }
    if (!['all_drivers', 'all_passengers'].includes(audience)) {
      return res.status(400).json({ message: "Audience must be 'all_drivers' or 'all_passengers'." });
    }

    // Raw query for drivers — the Driver model doesn't map fcm_token through
    // fromRow(), so Driver.find() rows never carry a usable token.
    const tokens = audience === 'all_drivers'
      ? (await query(`SELECT fcm_token FROM drivers WHERE fcm_token IS NOT NULL AND fcm_token != ''`)).rows.map((r: any) => r.fcm_token).filter(Boolean)
      : (await User.find()).map((r: any) => r.fcm_token).filter(Boolean);

    await sendPushToTokens(tokens, title, body);

    const log = new NotificationLog({
      title,
      body,
      audience,
      recipient_count: tokens.length,
      sent_by: req.admin!.id,
    });
    await log.save();

    res.status(201).json({ message: `Sent to ${tokens.length} recipient(s).`, log });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
