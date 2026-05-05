const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Unsere-Schickeria-2026@api.labs-schickeria.com:5433/labs_db',
  ssl: false
});

const sql = `
ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS is_vfx BOOLEAN DEFAULT false;
ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS focal_length VARCHAR(255);
ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS framerate VARCHAR(50);
ALTER TABLE agency_shotlist_items ADD COLUMN IF NOT EXISTS camera_type VARCHAR(255);
`;

pool.query(sql)
  .then(() => {
    console.log('Migration successful: Added shotlist new columns');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
