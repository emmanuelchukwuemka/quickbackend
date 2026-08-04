import crypto from 'crypto';
import { query } from '../db';
import { buildWhere } from './queryHelper';

// Driver wallet top-up is the only real-money path in this app — passengers
// never pay through the app, so this is intentionally a single-purpose
// ledger rather than a general one.
export type PaymentPurpose = 'wallet_topup';
export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface IPaymentTransaction {
  reference: string;
  purpose: PaymentPurpose;
  user_ref: string;
  email?: string;
  amount: number;
  status?: PaymentStatus;
  gateway_response?: string;
  created_at?: Date;
  verified_at?: Date;
}

export default class PaymentTransaction {
  id?: string;
  reference: string;
  purpose: PaymentPurpose;
  user_ref: string;
  email?: string;
  amount: number;
  status: PaymentStatus;
  gateway_response?: string;
  created_at?: Date;
  verified_at?: Date;

  constructor(data: Partial<IPaymentTransaction> & { id?: string } = {}) {
    this.id = data.id;
    this.reference = data.reference || '';
    this.purpose = data.purpose || 'wallet_topup';
    this.user_ref = data.user_ref || '';
    this.email = data.email || '';
    this.amount = Number(data.amount ?? 0);
    this.status = data.status || 'pending';
    this.gateway_response = data.gateway_response || '';
    this.created_at = data.created_at;
    this.verified_at = data.verified_at;
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      reference: this.reference,
      purpose: this.purpose,
      user_ref: this.user_ref,
      ride_ref: null,
      email: this.email || '',
      amount: this.amount,
      status: this.status,
      gateway_response: this.gateway_response || '',
      created_at: this.created_at || new Date(),
      verified_at: this.verified_at || null,
    };
  }

  static fromRow(row: any) {
    return new PaymentTransaction({
      id: row.id,
      reference: row.reference,
      purpose: row.purpose,
      user_ref: row.user_ref,
      email: row.email,
      amount: Number(row.amount),
      status: row.status,
      gateway_response: row.gateway_response,
      created_at: row.created_at,
      verified_at: row.verified_at,
    });
  }

  static async findByReference(reference: string) {
    const result = await query('SELECT * FROM payment_transactions WHERE reference = $1 LIMIT 1', [reference]);
    if (!result.rowCount) return null;
    return PaymentTransaction.fromRow(result.rows[0]);
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM payment_transactions WHERE ${clause} ORDER BY created_at DESC LIMIT 200`, values);
    return result.rows.map(PaymentTransaction.fromRow);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO payment_transactions (${columns.join(', ')}) VALUES (${placeholders})`, values);
    const saved = await PaymentTransaction.findByReference(this.reference);
    Object.assign(this, saved);
    return saved!;
  }

  // Atomically transitions pending -> success (or failed), guarded by the
  // WHERE status='pending' clause so a webhook and a client-triggered verify
  // racing on the same reference can only ever have one of them "win" and
  // actually apply the side effect (crediting the wallet).
  static async markSettled(reference: string, status: 'success' | 'failed', gatewayResponse: string): Promise<boolean> {
    const result = await query(
      `UPDATE payment_transactions SET status = $1, gateway_response = $2, verified_at = $3 WHERE reference = $4 AND status = 'pending'`,
      [status, gatewayResponse, new Date(), reference]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
