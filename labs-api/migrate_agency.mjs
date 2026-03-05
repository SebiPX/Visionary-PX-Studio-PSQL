import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pkg;

dotenv.config({ path: 'd:/PX AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/.env' });

const pool = new Pool({
  host: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'api.labs-schickeria.com',
  port: parseInt(process.env.DB_PORT || '5433'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: 'labs_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runAgencyMigration() {
  try {
    console.log('Starting agency_schema migration...');
    const sqlPath = path.resolve('d:/PX AgenturApp/PROJECT/CODE/2026/260226/Visionary-PX-Studio-PSQL/labs-api/agency_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('Successfully applied agency_schema.sql!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runAgencyMigration();
