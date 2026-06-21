import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/quick_backend';

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase') || connectionString.includes('render')
    ? { rejectUnauthorized: false }
    : false,
});

export const query = async (text: string, params: any[] = []) => {
  const result = await pool.query(text, params);
  return result;
};

export const initDb = async () => {
  await query(`
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
  `);

  await query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE users RENAME COLUMN "User_CurrentLocation" TO user_currentlocation;
      EXCEPTION WHEN undefined_column THEN
        NULL;
      END;
    END
    $$;
  `);

  await query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE users ADD COLUMN password TEXT;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
    END
    $$;
  `);

  await query(`
    DO $$
    BEGIN
      BEGIN ALTER TABLE users ADD COLUMN state TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN country TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN dob TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
      BEGIN ALTER TABLE users ADD COLUMN gender TEXT DEFAULT ''; EXCEPTION WHEN duplicate_column THEN NULL; END;
    END
    $$;
  `);

  await query(`
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
      lng DOUBLE PRECISION DEFAULT 0
    );
  `);

  await query(`
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE drivers ADD COLUMN wallet_balance NUMERIC(12,2) DEFAULT 0;
      EXCEPTION WHEN duplicate_column THEN
        NULL;
      END;
    END
    $$;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      passenger_ref TEXT REFERENCES users(id) ON DELETE SET NULL,
      driver_ref TEXT REFERENCES drivers(id) ON DELETE SET NULL,
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
      time TEXT DEFAULT '',
      requested_at TIMESTAMPTZ DEFAULT NOW(),
      accepted_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      rating INT
    );
  `);

  await query(`
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
  `);

  await query(`
    ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_user_ref_fkey;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS otps (
      id TEXT PRIMARY KEY,
      phone_number TEXT,
      email TEXT,
      code TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS cities (
      id TEXT PRIMARY KEY,
      location_name TEXT NOT NULL,
      lat DOUBLE PRECISION DEFAULT 0,
      lng DOUBLE PRECISION DEFAULT 0,
      pin_image TEXT DEFAULT ''
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ride_options (
      id TEXT PRIMARY KEY,
      "Type" TEXT NOT NULL,
      price TEXT DEFAULT '0.00',
      features TEXT DEFAULT '',
      numbersofseats TEXT DEFAULT '4',
      image_url TEXT DEFAULT ''
    );
  `);
};
