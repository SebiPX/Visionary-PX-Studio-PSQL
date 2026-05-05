import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Running ALTER TABLE for agency_call_sheet_schedule...');
    await client.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN IF NOT EXISTS scene_name VARCHAR(255);');
    await client.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN IF NOT EXISTS scene_number VARCHAR(50);');
    await client.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;');
    await client.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN IF NOT EXISTS is_done BOOLEAN DEFAULT FALSE;');
    await client.query('ALTER TABLE agency_call_sheet_schedule ADD COLUMN IF NOT EXISTS image_url TEXT;');
    console.log('Successfully altered table.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
