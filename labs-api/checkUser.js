const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Unsere-Schickeria-2026@72.60.83.29:5433/labs_db' });

async function checkUser() {
  const result = await pool.query('SELECT id, email, full_name, role FROM profiles WHERE email = $1', ['andre.nowak@efeso.com']);
  console.log('Profiles result:', result.rows);
  const authResult = await pool.query('SELECT * FROM agency_client_contacts WHERE email = $1', ['andre.nowak@efeso.com']);
  console.log('Contacts result:', authResult.rows);
  pool.end();
}
checkUser();
