import crypto from 'crypto';
import { query } from '../db';

export type WalletTransactionType = 'topup' | 'commission' | 'adjustment';

export interface IWalletTransaction {
  driver_ref: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  note?: string;
  ride_ref?: string;
  created_by?: string;
  created_at?: Date;
}

export default class WalletTransaction {
  id?: string;
  driver_ref: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  note?: string;
  ride_ref?: string;
  created_by?: string;
  created_at?: Date;

  constructor(data: Partial<IWalletTransaction> & { id?: string } = {}) {
    this.id = data.id;
    this.driver_ref = data.driver_ref || '';
    this.type = data.type || 'adjustment';
    this.amount = data.amount ?? 0;
    this.balance_after = data.balance_after ?? 0;
    this.note = data.note || '';
    this.ride_ref = data.ride_ref || '';
    this.created_by = data.created_by || '';
    this.created_at = data.created_at ? new Date(data.created_at) : undefined;
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      driver_ref: this.driver_ref,
      type: this.type,
      amount: this.amount,
      balance_after: this.balance_after,
      note: this.note || '',
      ride_ref: this.ride_ref || null,
      created_by: this.created_by || '',
      created_at: this.created_at || new Date(),
    };
  }

  static fromRow(row: any) {
    return new WalletTransaction({
      id: row.id,
      driver_ref: row.driver_ref,
      type: row.type,
      amount: Number(row.amount),
      balance_after: Number(row.balance_after),
      note: row.note,
      ride_ref: row.ride_ref ?? undefined,
      created_by: row.created_by,
      created_at: row.created_at,
    });
  }

  static async findByDriver(driverRef: string) {
    const result = await query(
      'SELECT * FROM wallet_transactions WHERE driver_ref = $1 ORDER BY created_at DESC LIMIT 100',
      [driverRef]
    );
    return result.rows.map(WalletTransaction.fromRow);
  }

  static async find() {
    const result = await query('SELECT * FROM wallet_transactions ORDER BY created_at DESC LIMIT 200', []);
    return result.rows.map(WalletTransaction.fromRow);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO wallet_transactions (${columns.join(', ')}) VALUES (${placeholders})`, values);
    Object.assign(this, row);
    return this;
  }
}
