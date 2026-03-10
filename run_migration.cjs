const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: './labs-api/.env' });

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');
        const sql = fs.readFileSync('./labs-api/social_account_reports.sql', 'utf8');
        await client.query(sql);
        console.log('Migration successful');
    } catch (e) {
        console.error('Migration failed', e);
    } finally {
        await client.end();
    }
}
run();
