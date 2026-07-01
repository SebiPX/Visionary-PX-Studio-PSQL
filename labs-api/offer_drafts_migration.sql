-- Migration Table to store persistent local offer drafts and grouping mappings
-- This allows PJMs to save their temporary work (groupings, quantity overloads, optional states)
-- in labs_db without destroying the real MOCO states, and prevents losing data on browser restarts.

CREATE TABLE IF NOT EXISTS public.agency_moco_offer_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    moco_offer_id INTEGER NOT NULL UNIQUE,
    project_id INTEGER,
    title TEXT NOT NULL,
    items_json JSONB NOT NULL, -- Holds custom quantity, unit_price, manualGroup, and optional toggles
    last_edited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for speedy queries
CREATE INDEX IF NOT EXISTS idx_moco_offer_drafts_offer_id ON public.agency_moco_offer_drafts(moco_offer_id);
