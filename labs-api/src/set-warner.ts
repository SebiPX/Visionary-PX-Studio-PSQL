import dotenv from 'dotenv';
dotenv.config();
import pool from './db';

async function run() {
  try {
    const warnerRes = await pool.query("SELECT id, company_name FROM agency_clients WHERE company_name ILIKE '%warner%' LIMIT 1");
    if (warnerRes.rows.length === 0) {
      console.log('Client "Warner" not found!');
      process.exit(1);
    }
    const warnerId = warnerRes.rows[0].id;
    console.log(`Found client: ${warnerRes.rows[0].company_name} (${warnerId})`);

    const updateRes = await pool.query(
      "UPDATE profiles SET client_id = $1, role = 'client' WHERE email = 'technik@pixelschickeria.de' RETURNING id, email, role, client_id",
      [warnerId]
    );

    if(updateRes.rows.length === 0) {
       console.log('User technik@pixelschickeria.de not found in profiles!');
    } else {
       console.log('Success! User updated:', updateRes.rows[0]);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
