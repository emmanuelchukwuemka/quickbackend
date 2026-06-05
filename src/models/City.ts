import crypto from 'crypto';
import { query } from '../db';
import { buildWhere } from './queryHelper';

export interface ICity {
  location_name: string;
  Latlng: { lat: number; lng: number };
  pin_image?: string;
}

export default class City {
  id?: string;
  location_name: string;
  Latlng: { lat: number; lng: number };
  pin_image?: string;

  constructor(data: Partial<ICity> & { id?: string } = {}) {
    this.id = data.id;
    this.location_name = data.location_name || '';
    this.Latlng = data.Latlng || { lat: 0, lng: 0 };
    this.pin_image = data.pin_image || '';
  }

  private toDbRow() {
    return {
      id: this.id! || crypto.randomUUID(),
      location_name: this.location_name,
      lat: this.Latlng.lat,
      lng: this.Latlng.lng,
      pin_image: this.pin_image || '',
    };
  }

  static fromRow(row: any) {
    return new City({
      id: row.id,
      location_name: row.location_name,
      Latlng: { lat: Number(row.lat), lng: Number(row.lng) },
      pin_image: row.pin_image,
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM cities WHERE ${clause}`, values);
    return result.rows.map(City.fromRow);
  }

  static async insertMany(records: any[]) {
    if (!records.length) return [];
    const rows = records.map((record) => {
      const city = new City({ ...record });
      const dbRow = city.toDbRow();
      return dbRow;
    });
    const values: any[] = [];
    const placeholders = rows
      .map((row, rowIndex) => {
        const rowPlaceholders = Object.values(row).map((_, index) => {
          const placeholderIndex = values.push(Object.values(row)[index]);
          return `$${placeholderIndex}`;
        });
        return `(${rowPlaceholders.join(', ')})`;
      })
      .join(', ');
    const columns = Object.keys(rows[0]);
    await query(`INSERT INTO cities (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`, values);
    return City.find();
  }
}
