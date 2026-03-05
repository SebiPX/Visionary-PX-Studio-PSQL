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
$$;

-- ── Generated 3D Models ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_3d (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    image_url   TEXT NOT NULL,
    model_url   TEXT NOT NULL,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_3d_user ON generated_3d(user_id);
-- =========================================================
-- labs_db Inventar Migration
-- Run AFTER schema.sql (profiles table must already exist)
-- =========================================================

-- ── 1. Firmendaten ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.firmendaten (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    kategorie    TEXT NOT NULL,
    bezeichner   TEXT,
    wert         TEXT,
    anmerkung    TEXT,
    datei_name   TEXT,
    sort_order   INTEGER DEFAULT 0
);

-- ── 2. Handyvertraege ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.handyvertraege (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    handynummer     TEXT,
    kartennummer    TEXT,
    pin             TEXT,
    puk             TEXT,
    pin2            TEXT,
    puk2            TEXT,
    anmerkung       TEXT,
    it_bestandsliste TEXT
);

-- ── 3. Inventar Items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventar_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    geraet              TEXT NOT NULL,
    px_nummer           TEXT,
    aufkleber           TEXT,
    modell              TEXT,
    seriennummer        TEXT,
    ort                 TEXT DEFAULT '@Office',
    os                  TEXT,
    status              TEXT DEFAULT 'Vorhanden',
    ip_office           TEXT,
    ip_tiger            TEXT,
    px_eigentum         BOOLEAN DEFAULT TRUE,
    handy_nr            TEXT,
    notes               TEXT,
    department          TEXT,
    is_verleihartikel   BOOLEAN DEFAULT FALSE,
    anschaffungsdatum   DATE,
    anschaffungspreis   NUMERIC,
    bild_url            TEXT,
    assigned_to_name    TEXT,
    assigned_to_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventar_items_assigned_to ON public.inventar_items(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_inventar_items_geraet      ON public.inventar_items(geraet);

-- ── 4. Inventar Links ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventar_links (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    titel        TEXT NOT NULL,
    url          TEXT NOT NULL,
    beschreibung TEXT,
    kategorie    TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0
);

-- ── 5. Inventar Loans ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventar_loans (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    item_id          UUID NOT NULL REFERENCES public.inventar_items(id) ON DELETE CASCADE,
    profile_id       UUID REFERENCES public.profiles(id),
    mitarbeiter_name TEXT,
    department       TEXT,
    ausgeliehen_am   DATE NOT NULL DEFAULT CURRENT_DATE,
    zurueck_bis      DATE,
    zurueck_am       DATE,
    zweck            TEXT,
    notes            TEXT,
    created_by       UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_inventar_loans_item    ON public.inventar_loans(item_id);
CREATE INDEX IF NOT EXISTS idx_inventar_loans_profile ON public.inventar_loans(profile_id);

-- ── 6. Kreditkarten ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kreditkarten (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    name         TEXT,
    nummer       TEXT,
    assignee     TEXT,
    ablaufdatum  TEXT,
    check_code   TEXT,
    pin_abheben  TEXT,
    secure_code  TEXT
);

-- ── 7. Logins ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.logins (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    name         TEXT,
    website      TEXT,
    login_name   TEXT,
    passwort     TEXT,
    anmerkung    TEXT,
    kategorie    TEXT,
    department   TEXT
);

-- ── 8. Verleihscheine ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verleihscheine (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    borrower_type    TEXT NOT NULL CHECK (borrower_type IN ('team', 'extern')),
    profile_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    extern_name      TEXT,
    extern_firma     TEXT,
    extern_email     TEXT,
    extern_telefon   TEXT,
    abholzeit        TIMESTAMPTZ NOT NULL,
    rueckgabezeit    TIMESTAMPTZ NOT NULL,
    prozentsatz      NUMERIC DEFAULT 10,
    gesamtkosten     NUMERIC,
    zweck            TEXT,
    notizen          TEXT,
    status           TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'erledigt')),
    erledigt_am      TIMESTAMPTZ,
    created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_verleihscheine_status ON public.verleihscheine(status);

-- ── 9. Verleihschein Items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verleihschein_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verleihschein_id  UUID REFERENCES public.verleihscheine(id) ON DELETE CASCADE,
    item_id           UUID REFERENCES public.inventar_items(id) ON DELETE CASCADE,
    anschaffungspreis NUMERIC,
    tagespreis        NUMERIC,
    gesamtpreis       NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_verleihschein_items_schein ON public.verleihschein_items(verleihschein_id);

-- ── 10. Inventar Dashboard Config ────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventar_dashboard_config (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    config     JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventar_dashboard_config_user ON public.inventar_dashboard_config(user_id);
-- ==========================================
-- PX Creative AI Event Agent Database Schema
-- ==========================================

-- 1. Projekte / Briefings
CREATE TABLE IF NOT EXISTS public.px_creative_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    current_step VARCHAR(50) DEFAULT 'briefing', 
    occasion VARCHAR(255) NOT NULL,
    guest_count INT NOT NULL,
    budget DECIMAL(12,2),
    season VARCHAR(50),
    industry VARCHAR(100),
    emotional_goals TEXT,
    target_audience VARCHAR(255),
    location_preference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_px_creative_projects_user ON px_creative_projects(user_id);

-- 2. Der Morphologische Kasten (Matrix-Daten)
CREATE TABLE IF NOT EXISTS public.px_creative_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES px_creative_projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    matrix_data JSONB NOT NULL,
    ai_suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Die generierten Konzepte (2 User, 2 KI)
CREATE TABLE IF NOT EXISTS public.px_creative_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES px_creative_projects(id) ON DELETE CASCADE NOT NULL,
    concept_type VARCHAR(50),
    selected_parameters JSONB NOT NULL,
    scamper_refinements JSONB,
    how_now_wow_score VARCHAR(50),
    budget_estimation VARCHAR(255),
    is_final_choice BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_px_creative_concepts_project ON px_creative_concepts(project_id);
-- ── Generated 3D Models ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_3d (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    image_url   TEXT NOT NULL,
    model_url   TEXT NOT NULL,
    config      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_3d_user ON generated_3d(user_id);
-- Migration: Create generated_music table
-- This table stores AI generated songs from Fal.ai

CREATE TABLE IF NOT EXISTS generated_music (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_generated_music_user_id ON generated_music(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_music_created_at ON generated_music(created_at DESC);
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
