const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' }); // we are inside labs-api

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await client.connect();
    const sql = `
      CREATE TABLE IF NOT EXISTS public.agency_news (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('internal', 'external')),
          publish_date TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agency_news_publish_date ON agency_news(publish_date DESC);
      CREATE INDEX IF NOT EXISTS idx_agency_news_type ON agency_news(type);
    `;
    await client.query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('DB Error:', err.message);
  } finally {
    await client.end();
  }
}
run();
