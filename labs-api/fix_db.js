const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function fix() {
  await client.connect();
  try {
    await client.query("ALTER TABLE verleihscheine DROP CONSTRAINT IF EXISTS verleihscheine_borrower_type_check;");
    await client.query("ALTER TABLE verleihscheine ADD CONSTRAINT verleihscheine_borrower_type_check CHECK (borrower_type IN ('team', 'extern', 'client'));");
    console.log('Constraint fixed');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
fix();
