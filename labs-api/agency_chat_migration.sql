-- Migration for ProjectFlow (Agency) Chat System

CREATE TABLE IF NOT EXISTS agency_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    channel_id VARCHAR(255) NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for fast querying by channel and timestamp
CREATE INDEX IF NOT EXISTS idx_agency_chat_channel ON agency_chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_agency_chat_created ON agency_chat_messages(created_at);

-- Add some basic Row Level Security if needed in the future, for now backend fully enforces it.
-- Grant permissions to supabase backend roles
GRANT ALL ON agency_chat_messages TO anon, authenticated, service_role;
