import pool from './src/db';

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create agency_cases table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agency_cases (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        project_id UUID REFERENCES agency_projects(id) ON DELETE SET NULL,
        title VARCHAR(255),
        notes TEXT,
        category VARCHAR(100),
        material_status VARCHAR(100),
        material_link TEXT,
        editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        website_editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        date_posting DATE,
        status_instagram VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_facebook VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_linkedin VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_website VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_youtube VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform',
        status_tiktok VARCHAR(100) DEFAULT 'Nicht auf dieser Plattform'
      );
    `);
    
    console.log("Successfully created agency_cases table.");

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
