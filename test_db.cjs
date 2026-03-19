const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: './labs-api/.env' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    await client.connect();
    const { rows } = await client.query('SELECT * FROM agency_news LIMIT 1');
    console.log('Query success:', rows);
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await client.end();
  }
}
check();
