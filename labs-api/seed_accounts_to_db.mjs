import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function run() {
  try {
    const csvPath = 'D:\\PX TOOLS\\INPUT\\AIRTABLE\\Accountliste-Grid view.csv';
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      process.exit(1);
    }

    console.log('Ensuring agency_accounts table exists in the database...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.agency_accounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          firma TEXT NOT NULL,
          kategorie TEXT,
          bemerkung TEXT,
          website TEXT,
          benutzername TEXT,
          passwort TEXT,
          kundennummer TEXT,
          strasse TEXT,
          telefonnummer TEXT,
          email TEXT,
          sonstiges TEXT,
          dokumente TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agency_accounts_firma ON public.agency_accounts(firma);
    `);

    console.log('Clearing existing entries in agency_accounts...');
    await pool.query('TRUNCATE TABLE public.agency_accounts RESTART IDENTITY;');

    console.log('Seeding agency_accounts from CSV...');
    const rows = [];
    fs.createReadStream(csvPath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/g, '') }))
      .on('data', (data) => rows.push(data))
      .on('end', async () => {
        try {
          for (const r of rows) {
            if (!r['FIRMA']) continue;
            await pool.query(
              `INSERT INTO public.agency_accounts 
               (firma, kategorie, bemerkung, website, benutzername, passwort, kundennummer, strasse, telefonnummer, email, sonstiges, dokumente)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                r['FIRMA'],
                r['Kategorie'] || null,
                r['Bemerkung'] || null,
                r['Website / Login'] || null,
                r['BENUTZERNAME'] || null,
                r['PASSWORT'] || null,
                r['Kundennummer'] || null,
                r['STRASSE'] || null,
                r['TELEFONNUMMER'] || null,
                r['EMAIL'] || null,
                r['SONSTIGES'] || null,
                r['Dokumente'] || null
              ]
            );
          }
          console.log(`Successfully seeded ${rows.length} accounts to database!`);
          await pool.end();
        } catch (seedErr) {
          console.error('Seeding failed:', seedErr.message);
          await pool.end();
        }
      });
  } catch (err) {
    console.error('Error running seed script:', err.message);
    await pool.end();
  }
}

run();
