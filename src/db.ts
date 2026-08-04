import mysql from 'mysql2/promise';

const rawUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/quick_backend';

export let pool: mysql.Pool;
const columnTypeCache = new Map<string, string | null>();

// This codebase is written throughout in Postgres-flavored SQL ($1/$2
// placeholders, ::casts, INTERVAL '5 minutes', ON CONFLICT DO NOTHING). Rather
// than rewrite every call site, this translates each query into the MySQL
// equivalent right before it runs, so the rest of the app never has to know
// which database engine is actually behind `query()`.
export const translateSql = (text: string, params: any[]): { sql: string; values: any[] } => {
  let sql = text;

  // Postgres type casts (::text, ::jsonb, ...) — MySQL needs none of these
  sql = sql.replace(/::\w+/g, '');

  // INTERVAL '5 minutes' -> INTERVAL 5 MINUTE
  sql = sql.replace(
    /INTERVAL\s+'(\d+)\s+(second|minute|hour|day|week|month|year)s?'/gi,
    (_m, n, unit) => `INTERVAL ${n} ${unit.toUpperCase()}`
  );

  // INSERT INTO x (...) VALUES (...) ON CONFLICT DO NOTHING -> INSERT IGNORE INTO ...
  sql = sql.replace(
    /INSERT INTO([\s\S]*?)\bON CONFLICT\s+DO\s+NOTHING\b/i,
    (_m, rest) => `INSERT IGNORE INTO${rest}`
  );

  // $1, $2, ... -> ?, honoring reuse or out-of-order references
  const values: any[] = [];
  sql = sql.replace(/\$(\d+)/g, (_m, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    values.push(params[idx]);
    return '?';
  });

  return { sql, values };
};

export const query = async (text: string, params: any[] = []) => {
  const { sql, values } = translateSql(text, params);
  const [result] = await pool.query(sql, values);
  if (Array.isArray(result)) {
    return { rows: result as any[], rowCount: (result as any[]).length, insertId: undefined as any };
  }
  const header = result as mysql.ResultSetHeader;
  return { rows: [] as any[], rowCount: header.affectedRows ?? 0, insertId: header.insertId };
};

export const getColumnDataType = async (tableName: string, columnName: string) => {
  const cacheKey = `${tableName}.${columnName}`;
  if (columnTypeCache.has(cacheKey)) {
    return columnTypeCache.get(cacheKey) ?? null;
  }

  const result = await query(
    `SELECT DATA_TYPE AS data_type
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName]
  );

  const dataType = result.rows[0]?.data_type ?? null;
  columnTypeCache.set(cacheKey, dataType);
  return dataType;
};

const run = async (sql: string, label: string) => {
  try {
    await query(sql);
  } catch (e: any) {
    console.warn(`[initDb] ${label}: ${e.message}`);
  }
};

export const initDb = async () => {
  pool = mysql.createPool({
    uri: rawUrl,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: false,
    // Fail loudly and fast instead of hanging indefinitely if the DB is
    // unreachable — a silent hang here looks identical to a healthy startup
    // from the outside (Passenger just returns 503 forever with no log).
    connectTimeout: 10000,
    // Report rows matched (not just rows actually changed) as affectedRows,
    // so `UPDATE ... WHERE x` followed by an `if (!result.rowCount)` check
    // behaves like Postgres's rowCount even when the new values happen to
    // match the old ones.
    flags: ['FOUND_ROWS'],
    // MySQL has no real boolean type — BOOLEAN columns are TINYINT(1) under
    // the hood and come back as 0/1. Postgres always gave the rest of the
    // app real true/false, and the Flutter client casts some of these
    // straight to `bool` (a runtime crash on an int in Dart), so convert
    // them back here rather than chase every call site.
    typeCast: (field: any, next: () => any) => {
      if (field.type === 'TINY' && field.length === 1) {
        const v = field.string();
        return v === null ? null : v === '1';
      }
      return next();
    },
  });

  // Prove the pool can actually reach the server before running any DDL —
  // this alone will surface a connection problem clearly in the logs.
  const conn = await pool.getConnection();
  conn.release();
  console.log('[db] connection test passed');

  // ── users ──────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      name VARCHAR(255) NOT NULL DEFAULT '',
      display_name VARCHAR(255) NOT NULL DEFAULT '',
      photo_url VARCHAR(500) DEFAULT '',
      phone_number VARCHAR(50) DEFAULT '',
      password VARCHAR(255) DEFAULT '',
      created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE,
      is_online VARCHAR(20) DEFAULT 'Offline',
      wallet_balance DECIMAL(12,2) DEFAULT 0,
      numbe_trips INT DEFAULT 0,
      user_currentlocation VARCHAR(500) DEFAULT '',
      lat DOUBLE DEFAULT 0,
      lng DOUBLE DEFAULT 0,
      state VARCHAR(255) DEFAULT '',
      country VARCHAR(255) DEFAULT '',
      dob VARCHAR(50) DEFAULT '',
      gender VARCHAR(50) DEFAULT '',
      fcm_token VARCHAR(1000) DEFAULT ''
    );
  `, 'create users');

  // ── drivers ────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      uid VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      name VARCHAR(255) NOT NULL DEFAULT '',
      full_name VARCHAR(255) NOT NULL DEFAULT '',
      display_name VARCHAR(255) NOT NULL DEFAULT '',
      photo_url VARCHAR(500) DEFAULT '',
      phone_number VARCHAR(50) DEFAULT '',
      password VARCHAR(255) DEFAULT '',
      created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      role VARCHAR(20) DEFAULT 'driver',
      is_active BOOLEAN DEFAULT TRUE,
      is_online VARCHAR(20) DEFAULT 'Offline',
      verification_status VARCHAR(20) DEFAULT 'pending',
      documents JSON,
      total_trips INT DEFAULT 0,
      driver_rating DECIMAL(3,2) DEFAULT 0,
      lat DOUBLE DEFAULT 0,
      lng DOUBLE DEFAULT 0,
      wallet_balance DECIMAL(12,2) DEFAULT 0,
      car_model VARCHAR(255) DEFAULT '',
      car_plate VARCHAR(50) DEFAULT '',
      fcm_token VARCHAR(1000) DEFAULT ''
    );
  `, 'create drivers');
  // Retrofits fcm_token onto drivers tables created before this column
  // existed here; run() already swallows "duplicate column" errors.
  await run(`ALTER TABLE drivers ADD COLUMN fcm_token VARCHAR(1000) DEFAULT ''`, 'add drivers.fcm_token');

  // ── rides ──────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS rides (
      id VARCHAR(36) PRIMARY KEY,
      passenger_ref VARCHAR(255),
      driver_ref VARCHAR(255),
      users VARCHAR(255),
      status VARCHAR(30) DEFAULT 'Pending',
      ride_type VARCHAR(30) DEFAULT 'standard',
      payment_method VARCHAR(30) DEFAULT 'cash',
      final_fare DECIMAL(12,2) DEFAULT 0,
      distanceKm DECIMAL(12,2) DEFAULT 0,
      pickup_lat DOUBLE,
      pickup_lng DOUBLE,
      dropoff_lat DOUBLE,
      dropoff_lng DOUBLE,
      pickup_address VARCHAR(500) DEFAULT '',
      dropoff_address VARCHAR(500) DEFAULT '',
      time VARCHAR(50) DEFAULT '',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted_at DATETIME NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      cancelled_at DATETIME NULL,
      rating INT NULL
    );
  `, 'create rides');

  // ── payments ───────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(36) PRIMARY KEY,
      user_ref VARCHAR(255),
      provider VARCHAR(50) NOT NULL,
      paymentMethod VARCHAR(30) DEFAULT 'card',
      paymentStatus VARCHAR(30) DEFAULT 'pending',
      masked_number VARCHAR(50) DEFAULT '',
      is_default BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create payments');

  // ── otps ───────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS otps (
      id VARCHAR(36) PRIMARY KEY,
      phone_number VARCHAR(50),
      email VARCHAR(255),
      code VARCHAR(20) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create otps');

  // ── cities ─────────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS cities (
      id VARCHAR(36) PRIMARY KEY,
      location_name VARCHAR(255) NOT NULL,
      lat DOUBLE DEFAULT 0,
      lng DOUBLE DEFAULT 0,
      pin_image VARCHAR(500) DEFAULT ''
    );
  `, 'create cities');

  // ── ride_options ───────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS ride_options (
      id VARCHAR(36) PRIMARY KEY,
      \`Type\` VARCHAR(50) NOT NULL,
      price VARCHAR(20) DEFAULT '0.00',
      features VARCHAR(500) DEFAULT '',
      numbersofseats VARCHAR(10) DEFAULT '4',
      image_url VARCHAR(500) DEFAULT ''
    );
  `, 'create ride_options');

  // ── scheduled_rides ────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS scheduled_rides (
      id VARCHAR(36) PRIMARY KEY,
      passenger_ref VARCHAR(255),
      pickup_address VARCHAR(500) DEFAULT '',
      dropoff_address VARCHAR(500) DEFAULT '',
      estimated_fare DECIMAL(12,2) DEFAULT 0,
      scheduled_time DATETIME NULL,
      status VARCHAR(30) DEFAULT 'Pending',
      driver_ref VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      pickup_lat DOUBLE DEFAULT 0,
      pickup_lng DOUBLE DEFAULT 0,
      dropoff_lat DOUBLE DEFAULT 0,
      dropoff_lng DOUBLE DEFAULT 0,
      ride_ref VARCHAR(36),
      reminded_20m BOOLEAN DEFAULT FALSE,
      reminded_10m BOOLEAN DEFAULT FALSE,
      reminded_5m BOOLEAN DEFAULT FALSE
    );
  `, 'create scheduled_rides');

  // ── admin_users ────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      display_name VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(30) NOT NULL DEFAULT 'support',
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME NULL
    );
  `, 'create admin_users');

  // ── promo_codes ────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(255) DEFAULT '',
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
      discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
      max_uses INT NULL,
      uses_count INT DEFAULT 0,
      expires_at DATETIME NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create promo_codes');

  // ── complaints ─────────────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS complaints (
      id VARCHAR(36) PRIMARY KEY,
      user_ref VARCHAR(255),
      user_role VARCHAR(20) DEFAULT 'passenger',
      subject VARCHAR(255) DEFAULT '',
      message TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL
    );
  `, 'create complaints');

  // ── notification_log ───────────────────────────────────────────────────────
  await run(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      audience VARCHAR(20) NOT NULL DEFAULT 'all_passengers',
      recipient_count INT DEFAULT 0,
      sent_by VARCHAR(255) DEFAULT '',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create notification_log');

  // ── admin_notifications ────────────────────────────────────────────────────
  // System-generated alerts *to* the admin panel (new driver application,
  // etc.) — distinct from notification_log, which is admin-sent messages
  // *to* drivers/passengers.
  await run(`
    CREATE TABLE IF NOT EXISTS admin_notifications (
      id VARCHAR(36) PRIMARY KEY,
      type VARCHAR(40) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      related_type VARCHAR(30),
      related_id VARCHAR(255),
      is_read BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create admin_notifications');

  // ── wallet_transactions ────────────────────────────────────────────────────
  // Signed ledger: positive amount = credit (admin top-up), negative =
  // debit (ride commission). balance_after makes it auditable independent
  // of the live drivers.wallet_balance value.
  await run(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id VARCHAR(36) PRIMARY KEY,
      driver_ref VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      balance_after DECIMAL(12,2) NOT NULL,
      note VARCHAR(500) DEFAULT '',
      ride_ref VARCHAR(36),
      created_by VARCHAR(255) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create wallet_transactions');

  // ── payment_transactions ───────────────────────────────────────────────────
  // Ledger of real Paystack transactions (driver wallet top-ups and passenger
  // ride payments). `reference` is the Paystack transaction reference and the
  // idempotency key — a transaction is only ever credited/settled once,
  // guarded by the UNIQUE constraint plus a status-guarded UPDATE.
  await run(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id VARCHAR(36) PRIMARY KEY,
      reference VARCHAR(100) NOT NULL UNIQUE,
      purpose VARCHAR(20) NOT NULL,
      user_ref VARCHAR(255) NOT NULL,
      ride_ref VARCHAR(36) NULL,
      email VARCHAR(255) DEFAULT '',
      amount DECIMAL(12,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      gateway_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME NULL
    );
  `, 'create payment_transactions');

  // ── fare_settings ──────────────────────────────────────────────────────────
  // Singleton config row (always id = 'default') driving fare calculation,
  // the driver wallet-funding gate, and the ride commission rate — all
  // editable from the admin panel instead of hardcoded constants.
  await run(`
    CREATE TABLE IF NOT EXISTS fare_settings (
      id VARCHAR(36) PRIMARY KEY,
      base_fare DECIMAL(12,2) NOT NULL DEFAULT 500,
      price_per_km DECIMAL(12,2) NOT NULL DEFAULT 150,
      standard_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1,
      premium_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1.3,
      xl_multiplier DECIMAL(6,2) NOT NULL DEFAULT 1,
      wallet_minimum_balance DECIMAL(12,2) NOT NULL DEFAULT 5000,
      commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, 'create fare_settings');
};
