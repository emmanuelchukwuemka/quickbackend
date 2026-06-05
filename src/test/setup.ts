import { initDb, query, pool } from '../db';

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await query('DELETE FROM payments');
  await query('DELETE FROM rides');
  await query('DELETE FROM otps');
  await query('DELETE FROM drivers');
  await query('DELETE FROM users');
  await query('DELETE FROM ride_options');
  await query('DELETE FROM cities');
});

afterAll(async () => {
  await pool.end();
});
