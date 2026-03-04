-- Migration: Create generated_music table
-- This table stores AI generated songs from Fal.ai

CREATE TABLE IF NOT EXISTS generated_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_generated_music_user_id ON generated_music(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_created_at ON generated_music(created_at DESC);
