-- =========================================================
-- labs_db Inventar Migration - Verleihscheine Clients & Protokoll
-- =========================================================

-- 1. Drop existing CHECK constraint on borrower_type
ALTER TABLE public.verleihscheine DROP CONSTRAINT IF EXISTS verleihscheine_borrower_type_check;

-- 2. Add the new borrower_type domain/constraint
ALTER TABLE public.verleihscheine ADD CONSTRAINT verleihscheine_borrower_type_check CHECK (borrower_type IN ('team', 'extern', 'client'));

-- 3. Add client_id column to map directly to existing clients table
ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.agency_clients(id) ON DELETE SET NULL;

-- 4. Add protocol text columns
ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS zustand_vorher TEXT;
ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS zustand_nachher TEXT;

-- 5. Add protocol photos array columns
ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS fotos_vorher TEXT[];
ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS fotos_nachher TEXT[];

-- Add indexes for optimization when fetching specific client logs
CREATE INDEX IF NOT EXISTS idx_verleihscheine_client ON public.verleihscheine(client_id);
