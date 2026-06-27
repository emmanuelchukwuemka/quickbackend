import { Pool } from 'pg';

const rawUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quick_backend';

export let pool: Pool;

export const query = async (text: string, params: any[] = []) => {
  const result = await pool.query(text, params);
  return result;
};

const run = async (sql: string, label: string) => {
  try {
    await query(sql);
  } catch (e: any) {
    console.warn(`[initDb] ${label}: ${e.message}`);
  }
};

export const initDb = async () => {
  pool = new Pool({
    connectionString: rawUrl,
    ssl: rawUrl.includes('neon') || rawUrl.includes('supabase') || rawUrl.includes('render')
      ? { rejectUnauthorized: false }
      : false,
  });

  // ── users ──────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      photo_url TEXT DEFAULT '',
      phone_number TEXT DEFAULT '',
      created_time TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE,
      is_online TEXT DEFAULT 'Offline',
      wallet_balance NUMERIC(12,2) DEFAULT 0,
      numbe_trips INT DEFAULT 0,
      user_currentlocation TEXT DEFAULT '',
      lat DOUBLE PRECISION DEFAULT 0,
      lng DOUBLE PRECISION DEFAULT 0
    );
  `, 'create users');

  await run(`ALTER TABLE users RENAME COLUMN "User_CurrentLocation" TO user_currentlocation;`, 'rename User_CurrentLocation');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';`, 'add users.display_name');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';`, 'add users.photo_url');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';`, 'add users.phone_number');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0;`, 'add users.wallet_balance');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS numbe_trips INT DEFAULT 0;`, 'add users.numbe_trips');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_currentlocation TEXT DEFAULT '';`, 'add users.user_currentlocation');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT 0;`, 'add users.lat');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT 0;`, 'add users.lng');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;`, 'add users.password');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS state   TEXT DEFAULT '';`, 'add users.state');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';`, 'add users.country');
  await run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dob     TEXT DEFAULT '';`, 'add users.dob');
  await run(`ALTER TABLE users ADD COLUMN gender  TEXT DEFAULT '';`, 'add users.gender');

  // ── drivers ────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      display_name TEXT NOT NULL DEFAULT '',
      photo_url TEXT DEFAULT '',
      phone_number TEXT DEFAULT '',
      password TEXT DEFAULT '',
      created_time TIMESTAMPTZ DEFAULT NOW(),
      role TEXT DEFAULT 'driver',
      is_active BOOLEAN DEFAULT TRUE,
      is_online TEXT DEFAULT 'Offline',
      verification_status TEXT DEFAULT 'pending',
      documents JSONB DEFAULT '[]',
      total_trips INT DEFAULT 0,
      driver_rating NUMERIC(3,2) DEFAULT 0,
      lat DOUBLE PRECISION DEFAULT 0,
      lng DOUBLE PRECISION DEFAULT 0,
      wallet_balance NUMERIC(12,2) DEFAULT 0
    );
  `, 'create drivers');

  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';`, 'add drivers.display_name');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';`, 'add drivers.photo_url');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';`, 'add drivers.phone_number');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS driver_rating NUMERIC(3,2) DEFAULT 0;`, 'add drivers.driver_rating');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_trips INT DEFAULT 0;`, 'add drivers.total_trips');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0;`, 'add drivers.wallet_balance');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT 0;`, 'add drivers.lat');
  await run(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT 0;`, 'add drivers.lng');

  // ── rides ──────────────────────────────────────────────────────────────────
  await run(`ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_passenger_ref_fkey;`, 'drop rides_passenger_ref_fkey');
  await run(`ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_driver_ref_fkey;`,    'drop rides_driver_ref_fkey');

  await run(`
    CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      passenger_ref TEXT,
      driver_ref TEXT,
      users TEXT,
      status TEXT DEFAULT 'Pending',
      ride_type TEXT DEFAULT 'standard',
      payment_method TEXT DEFAULT 'cash',
      final_fare NUMERIC(12,2) DEFAULT 0,
      distanceKm NUMERIC(12,2) DEFAULT 0,
      pickup_lat DOUBLE PRECISION,
      pickup_lng DOUBLE PRECISION,
      dropoff_lat DOUBLE PRECISION,
      dropoff_lng DOUBLE PRECISION,
      pickup_address TEXT DEFAULT '',
      dropoff_address TEXT DEFAULT '',
      time TEXT DEFAULT '',
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      rating INT
    );
  `, 'create rides');

  await run(`ALTER TABLE rides ADD COLUMN pickup_address  TEXT DEFAULT '';`, 'add rides.pickup_address');
  await run(`ALTER TABLE rides ADD COLUMN dropoff_address TEXT DEFAULT '';`, 'add rides.dropoff_address');
  await run(`ALTER TABLE rides ADD COLUMN driver_ref TEXT;`, 'add rides.driver_ref');
  await run(`ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_otp TEXT DEFAULT NULL;`, 'add rides.pickup_otp');

  // ── payments ───────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_ref TEXT,
      provider TEXT NOT NULL,
      paymentMethod TEXT DEFAULT 'card',
      paymentStatus TEXT DEFAULT 'pending',
      masked_number TEXT DEFAULT '',
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'create payments');

  await run(`ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_ref_fkey;`, 'drop payments_user_ref_fkey');

  // ── otps ───────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS otps (
      id TEXT PRIMARY KEY,
      phone_number TEXT,
      email TEXT,
      code TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'create otps');

  // ── cities ─────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS cities (
      id TEXT PRIMARY KEY,
      location_name TEXT NOT NULL,
      lat DOUBLE PRECISION DEFAULT 0,
      lng DOUBLE PRECISION DEFAULT 0,
      pin_image TEXT DEFAULT ''
    );
  `, 'create cities');

  // ── ride_options ───────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS ride_options (
      id TEXT PRIMARY KEY,
      "Type" TEXT NOT NULL,
      price TEXT DEFAULT '0.00',
      features TEXT DEFAULT '',
      numbersofseats TEXT DEFAULT '4',
      image_url TEXT DEFAULT ''
    );
  `, 'create ride_options');

  // ── scheduled_rides ────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS scheduled_rides (
      id TEXT PRIMARY KEY,
      passenger_ref TEXT,
      pickup_address TEXT DEFAULT '',
      dropoff_address TEXT DEFAULT '',
      estimated_fare NUMERIC(12,2) DEFAULT 0,
      scheduled_time TIMESTAMPTZ,
      status TEXT DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'create scheduled_rides');
};
