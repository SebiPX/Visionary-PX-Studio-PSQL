CREATE TABLE IF NOT EXISTS generated_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  prompt TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_voices_user_id ON generated_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_voices_created_at ON generated_voices(created_at);
