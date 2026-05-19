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
    await client.query('BEGIN');
    
    // Add column if not exists
    console.log('Adding is_gf_only column to logins...');
    await client.query(`
      ALTER TABLE logins 
      ADD COLUMN IF NOT EXISTS is_gf_only BOOLEAN DEFAULT false;
    `);

    // Update profiles to GF role
    console.log('Updating user roles to GF...');
    const gfUsers = [
      'Liena Nickel', 
      'Amin Abousteit', 
      'Matthias Selsam', 
      'Sebastian Geller'
    ];
    
    for (const name of gfUsers) {
      const res = await client.query(`
        UPDATE profiles 
        SET role = 'GF' 
        WHERE full_name ILIKE $1 
        RETURNING id, full_name, email;
      `, [`%${name}%`]);
      if (res.rowCount > 0) {
        console.log(`Updated ${name}: ${res.rows[0].email}`);
      } else {
        console.log(`Could not find user ${name}`);
      }
    }

    await client.query('COMMIT');
    console.log('Migration successful.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
