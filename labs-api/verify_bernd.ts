import dotenv from 'dotenv';
dotenv.config();

import pool from './src/db';

async function check() {
  try {
    const res = await pool.query("SELECT * FROM profiles WHERE email = 'bernd.closmann@pixelschickeria.de'");
    console.log("Bernd:", res.rows);
    if(res.rows.length > 0) {
        try {
            const p = await pool.query("INSERT INTO px_creative_projects (user_id, title, occasion, guest_count) VALUES ($1, 'Test', 'Test', 100) RETURNING *", [res.rows[0].id]);
            console.log("Project created:", p.rows);
            await pool.query("DELETE FROM px_creative_projects WHERE id = $1", [p.rows[0].id]);
        } catch(e) {
            console.error("Insert Error", e);
        }
    }
    const sebRes = await pool.query("SELECT * FROM profiles WHERE email = 'sebastian.geller@pixelschickeria.de'");
    console.log("Sebastian:", sebRes.rows);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    process.exit(0);
  }
}
check();
