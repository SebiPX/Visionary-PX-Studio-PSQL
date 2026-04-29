import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    console.log('Starting migration...');
    await pool.query(`
      ALTER TABLE inventar_items ADD COLUMN IF NOT EXISTS gewicht NUMERIC(10, 2) DEFAULT 0;

      CREATE TABLE IF NOT EXISTS agency_packing_list_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES agency_documents(id) ON DELETE CASCADE,
          inventar_item_id UUID,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(255),
          quantity INTEGER DEFAULT 1,
          weight_kg NUMERIC(10, 2) DEFAULT 0,
          is_packed BOOLEAN DEFAULT false,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
