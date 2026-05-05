const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Unsere-Schickeria-2026@72.60.83.29:5433/labs_db' });
client.connect()
    .then(() => client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'directory_locations'"))
    .then(res => { console.table(res.rows); client.end(); })
    .catch(console.error);
