const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function run() {
  try {
    await pool.query('ALTER TABLE agency_time_entries ADD COLUMN moco_activity_id INTEGER;');
    console.log('Added moco_activity_id to agency_time_entries');
  } catch (e) {
    if (e.message.includes('already exists')) {
       console.log('Column already exists');
    } else {
       console.error(e);
    }
  } finally {
    pool.end();
  }
}
run();
