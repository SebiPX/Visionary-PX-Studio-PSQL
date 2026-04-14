import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL?.replace('72.60.83.29:5433', '127.0.0.1:5432') || '';
console.log('Connecting to', url);

const pool = new Pool({
  connectionString: url,
});

async function run() {
  try {
    await pool.query('ALTER TABLE agency_tasks ADD COLUMN review_date DATE;');
    console.log('Added review_date');
  } catch (err: any) {
    if (err.code === '42701') console.log('review_date already exists');
    else console.error(err);
  }

  try {
    await pool.query('ALTER TABLE agency_tasks ADD COLUMN revision_date DATE;');
    console.log('Added revision_date');
  } catch (err: any) {
    if (err.code === '42701') console.log('revision_date already exists');
    else console.error(err);
  }
}

run().finally(() => pool.end());
