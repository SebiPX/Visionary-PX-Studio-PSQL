-- Table for Account-Level AI History Reports
CREATE TABLE IF NOT EXISTS social_account_reports (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES social_accounts(id) ON DELETE CASCADE,
    report_type VARCHAR(50) DEFAULT 'general', -- e.g., 'weekly', 'monthly', 'growth'
    report_text TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_account_reports_account_id ON social_account_reports(account_id);
