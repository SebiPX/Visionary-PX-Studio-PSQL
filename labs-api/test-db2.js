const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:admin@localhost:5432/px_studio'
});

async function run() {
  try {
    const pRes = await pool.query("SELECT * FROM agency_projects WHERE title ILIKE '%P26046%'");
    console.log('Projects:', pRes.rows);
    if(pRes.rows.length > 0) {
      const clientId = pRes.rows[0].client_id;
      const cRes = await pool.query("SELECT * FROM agency_client_contacts WHERE client_id = $1", [clientId]);
      console.log('Client contacts for project client:', cRes.rows);
      
      const pId = pRes.rows[0].id;
      const joinRes = await pool.query(`
          SELECT cc.full_name, cc.position, cc.email, cc.phone
          FROM agency_client_contacts cc
          JOIN agency_projects p ON cc.client_id = p.client_id
          WHERE p.id = $1
      `, [pId]);
      console.log('Join Query Result:', joinRes.rows);
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
