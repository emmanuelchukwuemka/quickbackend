import crypto from 'crypto';
import { query } from '../db';
import { buildWhere, buildUpdateSet } from './queryHelper';

export interface IPayment {
  user_ref: string;
  provider: string;
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'Cash';
  paymentStatus?: 'pending' | 'completed' | 'failed';
  masked_number?: string;
  is_default?: boolean;
  created_at?: Date;
}

export default class Payment {
  id?: string;
  user_ref: string;
  provider: string;
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'Cash';
  paymentStatus?: 'pending' | 'completed' | 'failed';
  masked_number?: string;
  is_default?: boolean;
  created_at?: Date;

  constructor(data: Partial<IPayment> & { id?: string } = {}) {
    this.id = data.id;
    this.user_ref = data.user_ref || '';
    this.provider = data.provider || '';
    this.paymentMethod = data.paymentMethod || 'card';
    this.paymentStatus = data.paymentStatus || 'pending';
    this.masked_number = data.masked_number || '';
    this.is_default = data.is_default ?? false;
    this.created_at = data.created_at ? new Date(data.created_at) : undefined;
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      user_ref: this.user_ref,
      provider: this.provider,
      paymentMethod: this.paymentMethod || 'card',
      paymentStatus: this.paymentStatus || 'pending',
      masked_number: this.masked_number || '',
      is_default: this.is_default ?? false,
      created_at: this.created_at || new Date(),
    };
  }

  static fromRow(row: any) {
    return new Payment({
      id: row.id,
      user_ref: row.user_ref,
      provider: row.provider,
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      masked_number: row.masked_number,
      is_default: row.is_default,
      created_at: row.created_at,
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM payments WHERE ${clause}`, values);
    return result.rows.map(Payment.fromRow);
  }

  static async findOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM payments WHERE ${clause} LIMIT 1`, values);
    if (!result.rowCount) return null;
    return Payment.fromRow(result.rows[0]);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM payments WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return Payment.fromRow(result.rows[0]);
  }

  static async findByIdAndUpdate(id: string, updates: any, options: { new?: boolean } = { new: false }) {
    const { set, values } = buildUpdateSet(updates);
    if (!set) return null;
    values.push(id);
    const result = await query(`UPDATE payments SET ${set} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rowCount) return null;
    return Payment.fromRow(result.rows[0]);
  }

  static async deleteMany(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM payments WHERE ${clause}`, values);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM payments WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    const result = await query(`INSERT INTO payments (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    const saved = Payment.fromRow(result.rows[0]);
    Object.assign(this, saved);
    return saved;
  }
}
