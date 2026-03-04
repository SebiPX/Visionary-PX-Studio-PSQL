import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFilePath = path.join(__dirname, 'models3d_migration.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

const sqlVoicesPath = path.join(__dirname, 'voices_migration.sql');
const sqlVoices = fs.readFileSync(sqlVoicesPath, 'utf8');

const sqlMusicPath = path.join(__dirname, 'music_migration.sql');
const sqlMusic = fs.readFileSync(sqlMusicPath, 'utf8');

const sqlI2audioPath = path.join(__dirname, 'i2audio_migration.sql');
const sqlI2audio = fs.readFileSync(sqlI2audioPath, 'utf8');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Running migration models3d_migration.sql...');
    await client.query(sql);
    console.log('Running migration voices_migration.sql...');
    await client.query(sqlVoices);
    console.log('Running migration music_migration.sql...');
    await client.query(sqlMusic);
    console.log('Running migration i2audio_migration.sql...');
    await client.query(sqlI2audio);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error running migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
