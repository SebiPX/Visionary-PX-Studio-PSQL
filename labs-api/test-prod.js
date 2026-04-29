const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Unsere-Schickeria-2026@api.labs-schickeria.com:5433/labs_db' });

pool.query('SELECT id, geraet, modell FROM inventar_items').then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}).catch(err => { console.error(err); pool.end(); });
