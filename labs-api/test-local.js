const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://admin:admin@localhost:5432/px_studio' });
pool.query('SELECT id, geraet, modell FROM inventar_items').then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}).catch(err => { console.error(err); pool.end(); });
