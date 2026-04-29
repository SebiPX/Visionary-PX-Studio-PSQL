const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/px_studio'
});

async function run() {
  try {
    const res = await pool.query('SELECT p.id as project_id, p.client_id FROM agency_projects p LIMIT 5;');
    console.log('Projects:', res.rows);

    if (res.rows.length > 0) {
      const q = `
        SELECT cc.full_name, cc.position, cc.email, cc.phone
        FROM agency_client_contacts cc
        JOIN agency_projects p ON cc.client_id = p.client_id
        WHERE p.id = $1
      `;
      const contactsRes = await pool.query(q, [res.rows[0].project_id]);
      console.log('Contacts for project:', contactsRes.rows);
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
