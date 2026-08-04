import crypto from 'crypto';
import { query } from '../db';
import { buildWhere, buildUpdateSet } from './queryHelper';

export interface IRideOption {
  Type: string;
  price?: string;
  features?: string;
  numbersofseats?: string;
}

export default class RideOption {
  id?: string;
  Type: string;
  price?: string;
  features?: string;
  numbersofseats?: string;

  constructor(data: Partial<IRideOption> & { id?: string } = {}) {
    this.id = data.id;
    this.Type = data.Type || '';
    this.price = data.price || '0.00';
    this.features = data.features || '';
    this.numbersofseats = data.numbersofseats || '4';
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      Type: this.Type,
      price: this.price || '0.00',
      features: this.features || '',
      numbersofseats: this.numbersofseats || '4',
    };
  }

  static fromRow(row: any) {
    return new RideOption({
      id: row.id,
      Type: row.Type,
      price: row.price,
      features: row.features,
      numbersofseats: row.numbersofseats,
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM ride_options WHERE ${clause}`, values);
    return result.rows.map(RideOption.fromRow);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM ride_options WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return RideOption.fromRow(result.rows[0]);
  }

  static async findByIdAndUpdate(id: string, updates: any) {
    const { set, values } = buildUpdateSet(updates);
    if (!set) return null;
    values.push(id);
    await query(`UPDATE ride_options SET ${set} WHERE id = $${values.length}`, values);
    return RideOption.findById(id);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM ride_options WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row).map((column) => (column === 'Type' ? '`Type`' : column));
    const placeholders = Object.keys(row).map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    await query(`INSERT INTO ride_options (${columns.join(', ')}) VALUES (${placeholders})`, values);
    const saved = await RideOption.findById(row.id);
    Object.assign(this, saved);
    return saved!;
  }

  static async insertMany(records: any[]) {
    if (!records.length) return [];
    const rows = records.map((record) => {
      const option = new RideOption({ ...record });
      return option.toDbRow();
    });

    const values: any[] = [];
    const placeholders = rows
      .map((row) => {
        const rowPlaceholders = Object.values(row).map((value) => {
          const idx = values.push(value);
          return `$${idx}`;
        });
        return `(${rowPlaceholders.join(', ')})`;
      })
      .join(', ');

    const columns = Object.keys(rows[0]).map((column) => column === 'Type' ? '`Type`' : column);
    await query(`INSERT INTO ride_options (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`, values);
    return RideOption.find();
  }
}
