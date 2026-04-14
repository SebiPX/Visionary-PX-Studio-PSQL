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
    console.log('Running ALTER TABLE for px_creative_projects.occasion...');
    await client.query('ALTER TABLE px_creative_projects ALTER COLUMN occasion TYPE TEXT;');
    console.log('Successfully altered occasion to TEXT.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
