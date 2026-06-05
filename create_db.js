require('dotenv').config();
const { Client } = require('pg');

async function createDatabase() {
  // Parse the DATABASE_URL to connect to the default 'postgres' database instead of 'quick_backend'
  const connectionString = process.env.DATABASE_URL.replace('/quick_backend', '/postgres');
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to default postgres database.");
    
    // Check if database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'quick_backend'");
    if (res.rowCount === 0) {
      console.log("Creating quick_backend database...");
      await client.query('CREATE DATABASE quick_backend');
      console.log("Database created successfully!");
    } else {
      console.log("Database already exists.");
    }
  } catch (error) {
    console.error("Error creating database:", error);
  } finally {
    await client.end();
  }
}

createDatabase();
