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
