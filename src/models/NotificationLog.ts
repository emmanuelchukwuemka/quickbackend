import crypto from 'crypto';
import { query } from '../db';

export interface INotificationLog {
  title: string;
  body?: string;
  audience?: 'all_drivers' | 'all_passengers';
  recipient_count?: number;
  sent_by?: string;
  sent_at?: Date;
}

export default class NotificationLog {
  id?: string;
  title: string;
  body?: string;
  audience?: 'all_drivers' | 'all_passengers';
  recipient_count?: number;
  sent_by?: string;
  sent_at?: Date;

  constructor(data: Partial<INotificationLog> & { id?: string } = {}) {
    this.id = data.id;
    this.title = data.title || '';
    this.body = data.body || '';
    this.audience = data.audience || 'all_passengers';
    this.recipient_count = data.recipient_count ?? 0;
    this.sent_by = data.sent_by || '';
    this.sent_at = data.sent_at ? new Date(data.sent_at) : undefined;
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      title: this.title,
      body: this.body || '',
      audience: this.audience || 'all_passengers',
      recipient_count: this.recipient_count ?? 0,
      sent_by: this.sent_by || '',
      sent_at: this.sent_at || new Date(),
    };
  }

  static fromRow(row: any) {
    return new NotificationLog({
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience,
      recipient_count: Number(row.recipient_count),
      sent_by: row.sent_by,
      sent_at: row.sent_at,
    });
  }

  static async find() {
    const result = await query('SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 100', []);
    return result.rows.map(NotificationLog.fromRow);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO notification_log (${columns.join(', ')}) VALUES (${placeholders})`, values);
    Object.assign(this, row);
    return this;
  }
}
