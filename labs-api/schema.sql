-- =========================================================
-- labs_db Schema — PX AIssistent V4 (PSQL Migration)
-- Run this in DBeaver connected to labs_db
-- pgvector extension already installed: CREATE EXTENSION IF NOT EXISTS vector;
-- =========================================================

-- ── Profiles (replaces Supabase auth.users + public.profiles) ──
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,        -- bcrypt, managed by labs-api
    full_name   TEXT DEFAULT '',
    avatar_url  TEXT,
    role        TEXT DEFAULT 'user',    -- 'user' | 'admin'
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ── Chat Sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title       TEXT,
    bot_id      TEXT,
    messages    JSONB DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- ── Storyboard Sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storyboard_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title           TEXT,
    concept         TEXT,
    target_duration INTEGER,
    num_shots       INTEGER,
    config          JSONB DEFAULT '{}',
    assets          JSONB DEFAULT '[]',
    shots           JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storyboard_user ON storyboard_sessions(user_id);

-- ── Generated Images ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    prompt      TEXT,
    style       TEXT,
    image_url   TEXT NOT NULL,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_images_user ON generated_images(user_id);

-- ── Generated Thumbnails ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_thumbnails (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    prompt      TEXT,
    platform    TEXT,
    image_url   TEXT NOT NULL,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thumbnails_user ON generated_thumbnails(user_id);

-- ── Generated Videos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_videos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    prompt          TEXT,
    model           TEXT,
    video_url       TEXT NOT NULL,
    thumbnail_url   TEXT,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_user ON generated_videos(user_id);

-- ── Generated Sketches ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_sketches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    sketch_data         TEXT NOT NULL,      -- URL to R2 or base64 fallback
    generated_image_url TEXT,
    context             TEXT NOT NULL,
    style               TEXT NOT NULL,
    edit_history        JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sketches_user ON generated_sketches(user_id);
CREATE INDEX IF NOT EXISTS idx_sketches_created ON generated_sketches(created_at DESC);

-- ── Generated Texts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_texts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    prompt      TEXT,
    content     TEXT,
    type        TEXT,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_texts_user ON generated_texts(user_id);

-- ── Onboarding Embeddings (RAG — pgvector) ────────────────────
-- Table likely already exists. Run only if not present.
CREATE TABLE IF NOT EXISTS public.onboarding_embeddings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    heading     TEXT,
    content     TEXT,
    tokens      INT,
    embedding   vector(3072),   -- gemini-embedding-001 (3072-dim)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_onboarding_docs(
    query_embedding vector(3072),
    match_count int DEFAULT 5
)
RETURNS TABLE (id uuid, heading text, content text, similarity float)
LANGUAGE sql STABLE AS $$
    SELECT id, heading, content,
           1 - (embedding <=> query_embedding) AS similarity
    FROM onboarding_embeddings
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
