import { query } from '../db';
import { buildUpdateSet } from './queryHelper';

export interface IFareSettings {
  id: string;
  base_fare: number;
  price_per_km: number;
  standard_multiplier: number;
  premium_multiplier: number;
  xl_multiplier: number;
  wallet_minimum_balance: number;
  commission_percent: number;
  updated_at?: Date;
}

const DEFAULT_ID = 'default';

// Singleton config row (always id = 'default') driving fare calculation, the
// driver wallet-funding gate, and the ride commission rate.
export default class FareSettings {
  id: string;
  base_fare: number;
  price_per_km: number;
  standard_multiplier: number;
  premium_multiplier: number;
  xl_multiplier: number;
  wallet_minimum_balance: number;
  commission_percent: number;
  updated_at?: Date;

  constructor(data: Partial<IFareSettings> = {}) {
    this.id = data.id || DEFAULT_ID;
    this.base_fare = Number(data.base_fare ?? 500);
    this.price_per_km = Number(data.price_per_km ?? 150);
    this.standard_multiplier = Number(data.standard_multiplier ?? 1);
    this.premium_multiplier = Number(data.premium_multiplier ?? 1.3);
    this.xl_multiplier = Number(data.xl_multiplier ?? 1);
    this.wallet_minimum_balance = Number(data.wallet_minimum_balance ?? 5000);
    this.commission_percent = Number(data.commission_percent ?? 10);
    this.updated_at = data.updated_at;
  }

  static fromRow(row: any) {
    return new FareSettings({
      id: row.id,
      base_fare: row.base_fare,
      price_per_km: row.price_per_km,
      standard_multiplier: row.standard_multiplier,
      premium_multiplier: row.premium_multiplier,
      xl_multiplier: row.xl_multiplier,
      wallet_minimum_balance: row.wallet_minimum_balance,
      commission_percent: row.commission_percent,
      updated_at: row.updated_at,
    });
  }

  static async getSettings(): Promise<FareSettings> {
    await query(`INSERT INTO fare_settings (id) VALUES ($1) ON CONFLICT DO NOTHING`, [DEFAULT_ID]);
    const result = await query(`SELECT * FROM fare_settings WHERE id = $1 LIMIT 1`, [DEFAULT_ID]);
    if (!result.rowCount) return new FareSettings();
    return FareSettings.fromRow(result.rows[0]);
  }

  static async updateSettings(updates: Partial<IFareSettings>): Promise<FareSettings> {
    await FareSettings.getSettings(); // ensure the default row exists before updating it
    const { set, values } = buildUpdateSet({ ...updates, updated_at: new Date() });
    if (set) {
      values.push(DEFAULT_ID);
      await query(`UPDATE fare_settings SET ${set} WHERE id = $${values.length}`, values);
    }
    return FareSettings.getSettings();
  }
}
