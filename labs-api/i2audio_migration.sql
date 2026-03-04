-- Migration: Create generated_i2audio table
-- This table stores AI generated videos from Fal.ai Creatify Aurora

CREATE TABLE IF NOT EXISTS generated_i2audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_generated_i2audio_user_id ON generated_i2audio(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_i2audio_created_at ON generated_i2audio(created_at DESC);
