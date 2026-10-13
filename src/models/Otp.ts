import crypto from 'crypto';
import { query } from '../db';
import { buildWhere } from './queryHelper';

export interface IOtp {
  phone_number?: string;
  email?: string;
  code: string;
  createdAt?: Date;
}

export default class Otp {
  id?: string;
  phone_number?: string;
  email?: string;
  code: string;
  createdAt?: Date;

  constructor(data: Partial<IOtp> & { id?: string } = {}) {
    this.id = data.id;
    this.phone_number = data.phone_number;
    this.email = data.email;
    this.code = data.code || '';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      phone_number: this.phone_number || null,
      email: this.email || null,
      code: this.code,
      created_at: this.createdAt || new Date(),
    };
  }

  static fromRow(row: any) {
    return new Otp({
      id: row.id,
      phone_number: row.phone_number ?? undefined,
      email: row.email ?? undefined,
      code: row.code,
      createdAt: row.created_at,
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM otps WHERE ${clause}`, values);
    return result.rows.map(Otp.fromRow);
  }

  static async findOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    // Compare against a cutoff computed here rather than the DB's own NOW() —
    // otherwise any clock/timezone drift between the app server and the DB
    // server makes a just-created code look already expired.
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const allValues = [...values, cutoff];
    const result = await query(`SELECT * FROM otps WHERE ${clause} AND created_at >= $${allValues.length} LIMIT 1`, allValues);
    if (!result.rowCount) return null;
    return Otp.fromRow(result.rows[0]);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM otps WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return Otp.fromRow(result.rows[0]);
  }

  static async deleteMany(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM otps WHERE ${clause}`, values);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM otps WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO otps (${columns.join(', ')}) VALUES (${placeholders})`, values);
    const saved = await Otp.findById(row.id);
    Object.assign(this, saved);
    return saved!;
  }
}
