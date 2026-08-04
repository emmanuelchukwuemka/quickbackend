import crypto from 'crypto';
import { query } from '../db';
import { buildWhere, buildUpdateSet } from './queryHelper';

export interface IPromoCode {
  code: string;
  description?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
  max_uses?: number | null;
  uses_count?: number;
  expires_at?: Date | null;
  is_active?: boolean;
  created_at?: Date;
}

export default class PromoCode {
  id?: string;
  code: string;
  description?: string;
  discount_type?: 'percent' | 'fixed';
  discount_value?: number;
  max_uses?: number | null;
  uses_count?: number;
  expires_at?: Date | null;
  is_active?: boolean;
  created_at?: Date;

  constructor(data: Partial<IPromoCode> & { id?: string } = {}) {
    this.id = data.id;
    this.code = (data.code || '').toUpperCase();
    this.description = data.description || '';
    this.discount_type = data.discount_type || 'percent';
    this.discount_value = data.discount_value ?? 0;
    this.max_uses = data.max_uses ?? null;
    this.uses_count = data.uses_count ?? 0;
    this.expires_at = data.expires_at ? new Date(data.expires_at) : null;
    this.is_active = data.is_active ?? true;
    this.created_at = data.created_at ? new Date(data.created_at) : undefined;
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      code: this.code,
      description: this.description || '',
      discount_type: this.discount_type || 'percent',
      discount_value: this.discount_value ?? 0,
      max_uses: this.max_uses,
      uses_count: this.uses_count ?? 0,
      expires_at: this.expires_at,
      is_active: this.is_active ?? true,
      created_at: this.created_at || new Date(),
    };
  }

  static fromRow(row: any) {
    return new PromoCode({
      id: row.id,
      code: row.code,
      description: row.description,
      discount_type: row.discount_type,
      discount_value: Number(row.discount_value),
      max_uses: row.max_uses === null ? null : Number(row.max_uses),
      uses_count: Number(row.uses_count),
      expires_at: row.expires_at,
      is_active: row.is_active,
      created_at: row.created_at,
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM promo_codes WHERE ${clause} ORDER BY created_at DESC`, values);
    return result.rows.map(PromoCode.fromRow);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM promo_codes WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return PromoCode.fromRow(result.rows[0]);
  }

  static async findByIdAndUpdate(id: string, updates: any) {
    const { set, values } = buildUpdateSet(updates);
    if (!set) return null;
    values.push(id);
    await query(`UPDATE promo_codes SET ${set} WHERE id = $${values.length}`, values);
    return PromoCode.findById(id);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM promo_codes WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO promo_codes (${columns.join(', ')}) VALUES (${placeholders})`, values);
    const saved = await PromoCode.findById(row.id);
    Object.assign(this, saved);
    return saved!;
  }
}
