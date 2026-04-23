import { Pool } from 'pg';

const aiNewsPool = new Pool({
  connectionString: 'postgresql://ai_news_user:ai_news_pw_change_me@72.62.52.75:5432/ai_news?sslmode=require',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

aiNewsPool.on('error', (err) => {
  console.error('[aiNewsDB] Unexpected pool error:', err);
});

export default aiNewsPool;
