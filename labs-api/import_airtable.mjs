import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseNumeric = (str) => {
    if (!str) return 'NULL';
    const clean = str.replace(/[^\d.,-]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 'NULL' : num;
};

const escapeSql = (val) => {
    if (val === null || val === undefined || val === '') return 'NULL';
    if (typeof val === 'number') return val;
    return "'" + String(val).replace(/'/g, "''") + "'";
};

const createTablesSql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS directory_freelancers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(100),
    email VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    daily_rate NUMERIC,
    notes TEXT,
    website TEXT,
    category VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS directory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    sqm NUMERIC,
    pax NUMERIC,
    cost NUMERIC,
    setup_cost NUMERIC,
    notes TEXT,
    address TEXT,
    phone VARCHAR(100),
    contact_person VARCHAR(255),
    email VARCHAR(255),
    website TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    category VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const importCsv = (filePath, processRow) => {
    return new Promise((resolve, reject) => {
        const results = [];
        if (!fs.existsSync(filePath)) {
            console.log(`[Skip] File not found: ${filePath}`);
            return resolve();
        }
        
        fs.createReadStream(filePath)
            .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/g, '') }))
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Parsed ${results.length} rows from ${path.basename(filePath)}`);
                await processRow(results);
                resolve();
            })
            .on('error', reject);
    });
};

async function runImport() {
    try {
        const inputDir = path.resolve('D:\\PX TOOLS\\INPUT\\AIRTABLE');
        const outputFile = path.join(inputDir, 'airtable_seed.sql');
        
        let sqlContent = createTablesSql + '\n\n';

        // 1. Accounts -> logged into existing 'logins' table
        await importCsv(path.join(inputDir, 'Accountliste-Grid view.csv'), async (rows) => {
            let inserted = 0;
            for (const r of rows) {
                if (!r['FIRMA']) continue;
                let anmerkung = r['Bemerkung'] || '';
                if (r['Kundennummer']) anmerkung += (anmerkung ? ' | ' : '') + 'Kd-Nr: ' + r['Kundennummer'];
                if (r['EMAIL']) anmerkung += (anmerkung ? ' | ' : '') + 'Email: ' + r['EMAIL'];
                if (r['TELEFONNUMMER']) anmerkung += (anmerkung ? ' | ' : '') + 'Tel: ' + r['TELEFONNUMMER'];
                if (r['SONSTIGES']) anmerkung += (anmerkung ? ' | ' : '') + r['SONSTIGES'];

                sqlContent += `INSERT INTO logins (name, kategorie, anmerkung, website, login_name, passwort, department) VALUES (${escapeSql(r['FIRMA'])}, ${escapeSql(r['Kategorie'])}, ${escapeSql(anmerkung)}, ${escapeSql(r['Website / Login'])}, ${escapeSql(r['BENUTZERNAME'])}, ${escapeSql(r['PASSWORT'])}, ${escapeSql('Import')});\n`;
                inserted++;
            }
            console.log(`-> Prepared ${inserted} accounts into existing 'logins' table.`);
        });

        sqlContent += '\n';

        // 2. Freelancers
        await importCsv(path.join(inputDir, 'Freelancer_Dienstleister-All.csv'), async (rows) => {
            let inserted = 0;
            for (const r of rows) {
                if (!r['Firma'] && !r['Nachname'] && !r['Vorname']) continue;
                const city = r['Ort '] ? r['Ort '].trim() : (r['Ort'] ? r['Ort'].trim() : null);
                sqlContent += `INSERT INTO directory_freelancers (company, first_name, last_name, phone, email, city, country, daily_rate, notes, website, category) VALUES (${escapeSql(r['Firma'])}, ${escapeSql(r['Vorname'])}, ${escapeSql(r['Nachname'])}, ${escapeSql(r['Telefon'])}, ${escapeSql(r['Email'])}, ${escapeSql(city)}, ${escapeSql(r['Land'])}, ${parseNumeric(r['Tagessatz'])}, ${escapeSql(r['Anmerkung'])}, ${escapeSql(r['Website'])}, ${escapeSql(r['Kategorie'])});\n`;
                inserted++;
            }
            console.log(`-> Prepared ${inserted} freelancers/suppliers.`);
        });

        sqlContent += '\n';

        // 3. Locations
        await importCsv(path.join(inputDir, 'Locations _ Studios-Grid view.csv'), async (rows) => {
            let inserted = 0;
            for (const r of rows) {
                if (!r['Name Location']) continue;
                sqlContent += `INSERT INTO directory_locations (name, sqm, pax, cost, setup_cost, notes, address, phone, contact_person, email, website, city, country, category) VALUES (${escapeSql(r['Name Location'])}, ${parseNumeric(r['qm'])}, ${parseNumeric(r['PAX'])}, ${parseNumeric(r['Kosten'])}, ${parseNumeric(r['Kosten Auf-/ Abbautag'])}, ${escapeSql(r['Anmerkungen'])}, ${escapeSql(r['Adresse'])}, ${escapeSql(r['Telefonnummer'])}, ${escapeSql(r['Ansprechpartner'])}, ${escapeSql(r['Email'])}, ${escapeSql(r['Webseite'])}, ${escapeSql(r['Ort'])}, ${escapeSql(r['Land'])}, ${escapeSql(r['Kategorie'])});\n`;
                inserted++;
            }
            console.log(`-> Prepared ${inserted} locations.`);
        });

        fs.writeFileSync(outputFile, sqlContent, 'utf8');
        console.log(`✅ SQL Seed file created successfully at: ${outputFile}`);
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

runImport();
