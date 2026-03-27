import pkg from 'pg';
const { Pool } = pkg;
// Configure pool identically to src/db/index.js if needed, or use defaults for local.
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'O6e7T6e7H5k4A8g5',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'labs_db',
});

async function runConsolidation() {
  const client = await pool.connect();
  try {
    console.log("Checking for duplicates in 'logins'...");

    // Find duplicates based on name, login_name, passwort
    const res = await client.query(`
      SELECT name, website, login_name, passwort, COUNT(*) as count, 
             array_agg(id) as ids, string_agg(anmerkung, ' | ') as notes
      FROM logins
      GROUP BY name, website, login_name, passwort
      HAVING COUNT(*) > 1
    `);

    const duplicates = res.rows;
    console.log(`Found ${duplicates.length} duplicate groups.`);

    for (let dup of duplicates) {
      console.log(`\nConsolidating: ${dup.name} (${dup.login_name}) - ${dup.count} entries`);
      
      const ids = dup.ids;
      // Keep the first ID, delete the rest.
      const keptId = ids[0];
      const deletedIds = ids.slice(1);

      // Merge the anmerkung if they differ.
      // We will just unique the notes strings.
      const uniqueNotes = [...new Set(dup.notes.split(' | ').filter(n => n && n.trim() !== ''))].join(' | ');

      // Update the kept record with merged notes
      await client.query(`UPDATE logins SET anmerkung = $1 WHERE id = $2`, [uniqueNotes, keptId]);
      
      // Delete the redundant records
      await client.query(`DELETE FROM logins WHERE id = ANY($1::int[])`, [deletedIds]);
      console.log(`Kept ID: ${keptId}. Deleted IDs: ${deletedIds.join(', ')}. Merged notes.`);
    }

    console.log("\nConsolidation complete.");
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runConsolidation();
