const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT id, full_name, email, moco_user_id FROM profiles WHERE email LIKE '%michael.walke%' OR email LIKE '%sebastian.geller%'")
  .then(res => { console.log(res.rows); pool.end(); })
  .catch(e => { console.error(e); pool.end(); });
