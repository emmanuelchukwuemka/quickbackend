import crypto from 'crypto';
import { query } from '../db';
import { buildWhere, buildUpdateSet } from './queryHelper';

export interface IRide {
  passenger_ref?: string;
  driver_ref?: string;
  users?: string;
  status?: 'Pending' | 'In_progress' | 'Completed' | 'cancelled' | 'searching' | 'requested' | 'in_progress' | 'accepted' | 'scheduled';
  ride_type?: 'standard' | 'premium' | 'car';
  payment_method?: 'cash' | 'card' | 'wallet' | 'Cash';
  final_fare?: number;
  distanceKm?: number;
  pickup?: {
    type: 'Point';
    coordinates: number[];
    lat?: number;
    lng?: number;
  };
  dropoff?: {
    type: 'Point';
    coordinates: number[];
    lat?: number;
    lng?: number;
  };
  pickup_address?: string;
  dropoff_address?: string;
  time?: string;
  requested_at?: Date;
  accepted_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  rating?: number;
}

export default class Ride {
  id?: string;
  passenger_ref?: string;
  driver_ref?: string;
  users?: string;
  status?: 'Pending' | 'In_progress' | 'Completed' | 'cancelled' | 'searching' | 'requested' | 'in_progress' | 'accepted' | 'scheduled';
  ride_type?: 'standard' | 'premium' | 'car';
  payment_method?: 'cash' | 'card' | 'wallet' | 'Cash';
  final_fare?: number;
  distanceKm?: number;
  pickup?: { type: 'Point'; coordinates: number[] };
  dropoff?: { type: 'Point'; coordinates: number[] };
  pickup_address?: string;
  dropoff_address?: string;
  time?: string;
  requested_at?: Date;
  accepted_at?: Date;
  started_at?: Date;
  completed_at?: Date;
  cancelled_at?: Date;
  rating?: number;

  constructor(data: Partial<IRide> & { id?: string } = {}) {
    this.id = data.id;
    this.passenger_ref = data.passenger_ref;
    this.driver_ref = data.driver_ref;
    this.users = data.users;
    this.status = data.status || 'Pending';
    this.ride_type = data.ride_type || 'standard';
    this.payment_method = data.payment_method || 'cash';
    this.final_fare = data.final_fare ?? 0;
    this.distanceKm = data.distanceKm ?? 0;
    this.pickup = data.pickup;
    this.dropoff = data.dropoff;
    this.pickup_address = data.pickup_address || '';
    this.dropoff_address = data.dropoff_address || '';
    this.time = data.time || '';
    this.requested_at = data.requested_at ? new Date(data.requested_at) : undefined;
    this.accepted_at = data.accepted_at ? new Date(data.accepted_at) : undefined;
    this.started_at = data.started_at ? new Date(data.started_at) : undefined;
    this.completed_at = data.completed_at ? new Date(data.completed_at) : undefined;
    this.cancelled_at = data.cancelled_at ? new Date(data.cancelled_at) : undefined;
    this.rating = data.rating;
  }

  private toDbRow() {
    const id = this.id! || crypto.randomUUID();
    const pickupCoords = this.pickup?.coordinates || [0, 0];
    const dropoffCoords = this.dropoff?.coordinates || [0, 0];

    return {
      id,
      passenger_ref: this.passenger_ref || null,
      driver_ref: this.driver_ref || null,
      users: this.users || null,
      status: this.status || 'Pending',
      ride_type: this.ride_type || 'standard',
      payment_method: this.payment_method || 'cash',
      final_fare: this.final_fare ?? 0,
      distanceKm: this.distanceKm ?? 0,
      pickup_lat: pickupCoords[1] ?? 0,
      pickup_lng: pickupCoords[0] ?? 0,
      dropoff_lat: dropoffCoords[1] ?? 0,
      dropoff_lng: dropoffCoords[0] ?? 0,
      pickup_address: this.pickup_address || '',
      dropoff_address: this.dropoff_address || '',
      time: this.time || '',
      requested_at: this.requested_at || new Date(),
      accepted_at: this.accepted_at || null,
      started_at: this.started_at || null,
      completed_at: this.completed_at || null,
      cancelled_at: this.cancelled_at || null,
      rating: this.rating ?? null,
    };
  }

  static fromRow(row: any) {
    return new Ride({
      id: row.id,
      passenger_ref: row.passenger_ref,
      driver_ref: row.driver_ref,
      users: row.users,
      status: row.status,
      ride_type: row.ride_type,
      payment_method: row.payment_method,
      final_fare: Number(row.final_fare),
      distanceKm: Number(row.distanceKm),
      pickup: {
        type: 'Point',
        coordinates: [Number(row.pickup_lng), Number(row.pickup_lat)],
        lat: Number(row.pickup_lat),
        lng: Number(row.pickup_lng),
      },
      dropoff: {
        type: 'Point',
        coordinates: [Number(row.dropoff_lng), Number(row.dropoff_lat)],
        lat: Number(row.dropoff_lat),
        lng: Number(row.dropoff_lng),
      },
      pickup_address: row.pickup_address ?? '',
      dropoff_address: row.dropoff_address ?? '',
      time: row.time,
      requested_at: row.requested_at,
      accepted_at: row.accepted_at,
      started_at: row.started_at,
      completed_at: row.completed_at,
      cancelled_at: row.cancelled_at,
      rating: row.rating,
    });
  }

  static async find(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM rides WHERE ${clause}`, values);
    return result.rows.map(Ride.fromRow);
  }

  static async findOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    const result = await query(`SELECT * FROM rides WHERE ${clause} LIMIT 1`, values);
    if (!result.rowCount) return null;
    return Ride.fromRow(result.rows[0]);
  }

  static async findById(id: string) {
    if (!id) return null;
    const result = await query('SELECT * FROM rides WHERE id = $1 LIMIT 1', [id]);
    if (!result.rowCount) return null;
    return Ride.fromRow(result.rows[0]);
  }

  static async findByIdAndUpdate(id: string, updates: any, options: { new?: boolean } = { new: false }) {
    const { set, values } = buildUpdateSet(updates);
    if (!set) return null;
    values.push(id);
    const result = await query(`UPDATE rides SET ${set} WHERE id = $${values.length} RETURNING *`, values);
    if (!result.rowCount) return null;
    return Ride.fromRow(result.rows[0]);
  }

  static async deleteMany(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM rides WHERE ${clause}`, values);
  }

  static async deleteOne(condition: any = {}) {
    const { clause, values } = buildWhere(condition);
    await query(`DELETE FROM rides WHERE ${clause}`, values);
  }

  async save() {
    const row = this.toDbRow();
    const columns = Object.keys(row);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const values = Object.values(row);
    const result = await query(`INSERT INTO rides (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`, values);
    const saved = Ride.fromRow(result.rows[0]);
    Object.assign(this, saved);
    return saved;
  }
}
