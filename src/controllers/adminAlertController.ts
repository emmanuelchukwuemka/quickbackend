import { Response } from 'express';
import AdminNotification from '../models/AdminNotification';
import type { AdminAuthRequest } from '../middleware/adminAuthMiddleware';

// System-generated alerts *to* the admin panel (new driver application,
// etc.) — distinct from notificationController.ts, which sends admin-authored
// messages *to* drivers/passengers.

export const listAdminAlerts = async (_req: AdminAuthRequest, res: Response) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      AdminNotification.find(),
      AdminNotification.countUnread(),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAdminAlertRead = async (req: AdminAuthRequest, res: Response) => {
  try {
    await AdminNotification.markRead(req.params.id as string);
    res.json({ message: 'Marked as read.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAdminAlertsRead = async (_req: AdminAuthRequest, res: Response) => {
  try {
    await AdminNotification.markAllRead();
    res.json({ message: 'All alerts marked as read.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
