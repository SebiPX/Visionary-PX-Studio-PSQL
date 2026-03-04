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
