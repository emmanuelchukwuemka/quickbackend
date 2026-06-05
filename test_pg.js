const { Pool } = require('pg');

const passwordsToTry = [
  'postgres',
  'root',
  'password',
  '1234',
  '12345',
  '123456',
  'admin',
  ''
];

async function tryPassword(password) {
  const connectionString = `postgres://postgres:${password}@localhost:5432/postgres`;
  const pool = new Pool({ connectionString });
  try {
    const client = await pool.connect();
    client.release();
    console.log(`SUCCESS: ${password}`);
    return true;
  } catch (error) {
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  for (const pwd of passwordsToTry) {
    console.log(`Trying: "${pwd}"`);
    if (await tryPassword(pwd)) {
      process.exit(0);
    }
  }
  console.log("FAILED_ALL");
  process.exit(1);
}

main();
