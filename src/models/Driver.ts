import crypto from 'crypto';
import { query } from '../db';
import { buildWhere, buildUpdateSet } from './queryHelper';

export interface IDriver {
  uid: string;
  email?: string;
  display_name: string;
  photo_url?: string;
  phone_number?: string;
  password?: string;
  created_time?: Date;
  role?: 'passenger' | 'driver';
  is_active?: boolean;
  is_online?: 'Online' | 'Offline';
  verification_status?: 'pending' | 'approved' | 'rejected';
  documents?: { type: string; url: string }[];
  total_trips?: number;
  driver_rating?: number;
  wallet_balance?: number;
  location?: {
    type: 'Point';
    coordinates: number[];
  };
}

export default class Driver {
  id?: string;
  uid: string;
  email?: string;
  display_name: string;
  photo_url?: string;
  phone_number?: string;
  password?: string;
  created_time?: Date;
  role?: 'passenger' | 'driver';
  is_active?: boolean;
  is_online?: 'Online' | 'Offline';
  verification_status?: 'pending' | 'approved' | 'rejected';
  documents?: { type: string; url: string }[];
  total_trips?: number;
  driver_rating?: number;
  wallet_balance?: number;
  location?: { type: 'Point'; coordinates: number[] };

  constructor(data: Partial<IDriver> & { id?: string } = {}) {
    this.id = data.id;
    this.uid = data.uid || '';
    this.email = data.email;
    this.display_name = data.display_name || '';
    this.photo_url = data.photo_url;
    this.phone_number = data.phone_number;
    this.password = data.password || '';
    this.created_time = data.created_time ? new Date(data.created_time) : undefined;
    this.role = data.role || 'driver';
    this.is_active = data.is_active ?? true;
    this.is_online = data.is_online || 'Offline';
    this.verification_status = data.verification_status || 'pending';
    this.documents = data.documents || [];
    this.total_trips = data.total_trips ?? 0;
    this.driver_rating = data.driver_rating ?? 0;
    this.wallet_balance = data.wallet_balance ?? 0;
    this.location = data.location;
  }

  private toDbRow() {
    const coordinates = this.location?.coordinates || [0, 0];

    return {
      email: this.email || null,
      display_name: this.display_name,
      photo_url: this.photo_url || '',
      phone_number: this.phone_number || '',
      password: this.password || '',
      role: this.role || 'driver',
      is_active: this.is_active ?? true,
      is_online: this.is_online || 'Offline',
      verification_status: this.verification_status || 'pending',
      documents: JSON.stringify(this.documents || []),
      total_trips: this.total_trips ?? 0,
      driver_rating: this.driver_rating ?? 0,
      wallet_balance: this.wallet_balance ?? 0,
      lat: coordinates[1] ?? 0,
      lng: coordinates[0] ?? 0,
    };
  }

  static fromRow(row: any) {
    return new Driver({
      id: row.id,
      uid: row.uid || row.id,
      email: row.email ?? undefined,
      display_name: row.display_name,
      photo_url: row.photo_url ?? undefined,
      phone_number: row.phone_number ?? undefined,
      password: row.password ?? undefined,
      created_time: row.created_time,
      role: row.role,
      is_active: row.is_active,
      is_online: row.is_online,
      verification_status: row.verification_status,
      documents: Array.isArray(row.documents) ? row.documents : row.documents ? JSON.parse(row.documents) : [],
      total_trips: row.total_trips,
      driver_rating: Number(row.driver_rating),
      wallet_balance: Number(row.wallet_balance),
      location: { type: 'Point', coordinates: [Number(row.lng), Number(row.lat)] },
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM drivers WHERE ${clause}`, values);
    return result.rows.map(Driver.fromRow);
  }

  static async findOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM drivers WHERE ${clause} LIMIT 1`, values);
    if (!result.rowCount) return null;
    return Driver.fromRow(result.rows[0]);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM drivers WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return Driver.fromRow(result.rows[0]);
  }

  static async findByIdAndUpdate(id: string, updates: any, options: { new?: boolean } = { new: false }) {
    const { set, values } = buildUpdateSet(updates);
    if (!set) return null;
    values.push(id);
    const result = await query(`UPDATE drivers SET ${set} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rowCount) return null;
    return Driver.fromRow(result.rows[0]);
  }

  static async deleteMany(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM drivers WHERE ${clause}`, values);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM drivers WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    const result = await query(`INSERT INTO drivers (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    const saved = Driver.fromRow(result.rows[0]);
    Object.assign(this, saved);
    return saved;
  }
}
