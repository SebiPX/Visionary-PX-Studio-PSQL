-- 1. Accounts: Wer wird getrackt?
CREATE TABLE IF NOT EXISTS social_accounts (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL, -- 'instagram' | 'tiktok'
    username VARCHAR(100),
    access_token TEXT,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Posts: Was wurde gepostet?
CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(255) UNIQUE,
    media_url TEXT,
    caption TEXT,
    post_type VARCHAR(50), -- 'reel', 'carousel', 'video'
    published_at TIMESTAMP WITH TIME ZONE
);

-- 3. Metrics: Wie erfolgreich war es?
CREATE TABLE IF NOT EXISTS social_metrics (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    engagement_rate NUMERIC(5,2),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. AI Insights: Warum war es erfolgreich?
CREATE TABLE IF NOT EXISTS social_ai_analysis (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
    sentiment VARCHAR(50),
    detected_patterns JSONB DEFAULT '{}'::jsonb,
    summary_text TEXT
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_account_id ON social_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_post_id ON social_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_social_ai_analysis_post_id ON social_ai_analysis(post_id);
