import crypto from 'crypto';
import { query } from '../db';
import { buildWhere } from './queryHelper';

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

    const columns = Object.keys(rows[0]);
    await query(`INSERT INTO ride_options (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`, values);
    return RideOption.find();
  }
}
