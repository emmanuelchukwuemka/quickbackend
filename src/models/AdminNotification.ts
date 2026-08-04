import crypto from 'crypto';
import { query } from '../db';

export type AdminNotificationType = 'driver_application' | 'wallet_topup_claim' | 'complaint';

export interface IAdminNotification {
  type: AdminNotificationType;
  title: string;
  message?: string;
  related_type?: string;
  related_id?: string;
  is_read?: boolean;
  created_at?: Date;
}

export default class AdminNotification {
  id?: string;
  type: AdminNotificationType;
  title: string;
  message?: string;
  related_type?: string;
  related_id?: string;
  is_read?: boolean;
  created_at?: Date;

  constructor(data: Partial<IAdminNotification> & { id?: string } = {}) {
    this.id = data.id;
    this.type = data.type || 'driver_application';
    this.title = data.title || '';
    this.message = data.message || '';
    this.related_type = data.related_type || '';
    this.related_id = data.related_id || '';
    this.is_read = data.is_read ?? false;
    this.created_at = data.created_at ? new Date(data.created_at) : undefined;
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      type: this.type,
      title: this.title,
      message: this.message || '',
      related_type: this.related_type || '',
      related_id: this.related_id || '',
      is_read: this.is_read ?? false,
      created_at: this.created_at || new Date(),
    };
  }

  static fromRow(row: any) {
    return new AdminNotification({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      related_type: row.related_type,
      related_id: row.related_id,
      is_read: row.is_read,
      created_at: row.created_at,
    });
  }

  static async find() {
    const result = await query('SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 200', []);
    return result.rows.map(AdminNotification.fromRow);
  }

  static async countUnread() {
    const result = await query('SELECT COUNT(*) AS c FROM admin_notifications WHERE is_read = $1', [false]);
    return Number(result.rows[0]?.c ?? 0);
  }

  static async markRead(id: string) {
    await query('UPDATE admin_notifications SET is_read = $1 WHERE id = $2', [true, id]);
  }

  static async markAllRead() {
    await query('UPDATE admin_notifications SET is_read = $1 WHERE is_read = $2', [true, false]);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO admin_notifications (${columns.join(', ')}) VALUES (${placeholders})`, values);
    Object.assign(this, row);
    return this;
  }
}
