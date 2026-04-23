import { Pool } from 'pg';

const aiNewsPool = new Pool({
  host: '72.62.52.75',
  port: 5432,
  database: 'ai_news',
  user: 'ai_news_user',
  password: 'Unsere-Schickeria-2025',
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

aiNewsPool.on('error', (err) => {
  console.error('[aiNewsDB] Unexpected pool error:', err);
});

export default aiNewsPool;
