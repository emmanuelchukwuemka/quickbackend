import crypto from 'crypto';
import { query } from '../db';
import { buildWhere, buildUpdateSet } from './queryHelper';

export interface IUser {
  uid: string;
  email?: string;
  password?: string;
  display_name: string;
  photo_url?: string;
  phone_number?: string;
  created_time?: Date;
  is_active?: boolean;
  is_online?: 'Online' | 'Offline';
  wallet_balance?: number;
  numbe_trips?: number;
  User_CurrentLocation?: string;
  state?: string;
  country?: string;
  dob?: string;
  gender?: string;
  location?: {
    type: 'Point';
    coordinates: number[];
  };
}

export default class User {
  id?: string;
  uid: string;
  email?: string;
  password?: string;
  display_name: string;
  photo_url?: string;
  phone_number?: string;
  created_time?: Date;
  is_active?: boolean;
  is_online?: 'Online' | 'Offline';
  wallet_balance?: number;
  state?: string;
  country?: string;
  dob?: string;
  gender?: string;
  numbe_trips?: number;
  User_CurrentLocation?: string;
  location?: { type: 'Point'; coordinates: number[] };

  constructor(data: Partial<IUser> & { id?: string } = {}) {
    this.id = data.id;
    this.uid = data.uid || '';
    this.email = data.email;
    this.password = data.password;
    this.display_name = data.display_name || '';
    this.photo_url = data.photo_url;
    this.phone_number = data.phone_number;
    this.created_time = data.created_time ? new Date(data.created_time) : undefined;
    this.is_active = data.is_active ?? true;
    this.is_online = data.is_online || 'Offline';
    this.wallet_balance = data.wallet_balance ?? 0;
    this.numbe_trips = data.numbe_trips ?? 0;
    this.User_CurrentLocation = data.User_CurrentLocation;
    this.state = data.state;
    this.country = data.country;
    this.dob = data.dob;
    this.gender = data.gender;
    this.location = data.location;
  }

  private toDbRow() {
    const coordinates = this.location?.coordinates || [0, 0];

    return {
      email: this.email || null,
      password: this.password || null,
      name: this.display_name || '',
      display_name: this.display_name || '',
      photo_url: this.photo_url || '',
      phone_number: this.phone_number || '',
      is_active: this.is_active ?? true,
      is_online: this.is_online || 'Offline',
      wallet_balance: this.wallet_balance ?? 0,
      numbe_trips: this.numbe_trips ?? 0,
      user_currentlocation: this.User_CurrentLocation || '',
      state: this.state || '',
      country: this.country || '',
      dob: this.dob || '',
      gender: this.gender || '',
      lat: coordinates[1] ?? 0,
      lng: coordinates[0] ?? 0,
    };
  }

  static fromRow(row: any) {
    return new User({
      id: row.id,
      uid: row.uid || row.id,
      email: row.email ?? undefined,
      password: row.password ?? undefined,
      display_name: row.display_name || row.name || '',
      photo_url: row.photo_url ?? undefined,
      phone_number: row.phone_number ?? undefined,
      created_time: row.created_time,
      is_active: row.is_active,
      is_online: row.is_online,
      wallet_balance: Number(row.wallet_balance),
      numbe_trips: row.numbe_trips,
      User_CurrentLocation: row.user_currentlocation ?? undefined,
      state: row.state ?? undefined,
      country: row.country ?? undefined,
      dob: row.dob ?? undefined,
      gender: row.gender ?? undefined,
      location: { type: 'Point', coordinates: [Number(row.lng), Number(row.lat)] },
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM users WHERE ${clause}`, values);
    return result.rows.map(User.fromRow);
  }

  static async findOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM users WHERE ${clause} LIMIT 1`, values);
    if (!result.rowCount) return null;
    return User.fromRow(result.rows[0]);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return User.fromRow(result.rows[0]);
  }

  static async findByIdAndUpdate(id: string, updates: any, options: { new?: boolean } = { new: false }) {
    const { set, values } = buildUpdateSet(updates);
    if (!set) return null;
    values.push(id);
    const result = await query(`UPDATE users SET ${set} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rowCount) return null;
    return User.fromRow(result.rows[0]);
  }

  static async deleteMany(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM users WHERE ${clause}`, values);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM users WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    const result = await query(`INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    const saved = User.fromRow(result.rows[0]);
    Object.assign(this, saved);
    return saved;
  }
}
