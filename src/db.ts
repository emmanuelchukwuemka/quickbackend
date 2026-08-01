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
};
