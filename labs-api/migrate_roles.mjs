import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Unsere-Schickeria-2026@api.labs-schickeria.com:5433/labs_db',
  ssl: false
});

async function migrateRoles() {
  try {
    const result = await pool.query(`
      UPDATE public.profiles 
      SET role = 'creative' 
      WHERE role NOT IN ('admin', 'client', 'creative') OR role IS NULL;
    `);
    console.log(`Migration complete. Updated ${result.rowCount} rows to 'creative'.`);
  } catch (err) {
    console.error("Error migrating roles", err);
  } finally {
    pool.end();
  }
}

migrateRoles();
