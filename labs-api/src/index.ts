import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import imageRoutes from './routes/images';
import videoRoutes from './routes/videos';
import thumbnailRoutes from './routes/thumbnails';
import sketchRoutes from './routes/sketches';
import textRoutes from './routes/texts';
import storyboardRoutes from './routes/storyboards';
import uploadRoutes from './routes/upload';
import models3dRoutes from './routes/models3d';
import voiceRoutes from './routes/voices';
import musicRoutes from './routes/music';
import { i2audioRoutes } from './routes/i2audio';
import inventarItemRoutes       from './routes/inventar/items';
import inventarLoanRoutes        from './routes/inventar/loans';
import inventarVerleihRoutes     from './routes/inventar/verleihscheine';
import inventarLinkRoutes        from './routes/inventar/links';
import inventarLoginRoutes       from './routes/inventar/logins';
import inventarKreditRoutes      from './routes/inventar/kreditkarten';
import inventarHandyRoutes       from './routes/inventar/handyvertraege';
import inventarFirmaRoutes       from './routes/inventar/firmendaten';
import inventarDashboardRoutes   from './routes/inventar/dashboard-config';
import inventarProfileRoutes     from './routes/inventar/profiles';
import geminiRoutes from './routes/gemini';
import openrouterRoutes from './routes/openrouter';
import ragRoutes from './routes/rag';
import chatRoutes from './routes/chats';
import proxyRoutes from './routes/proxy';
import creativeAgentRoutes from './routes/creativeAgent';
import socialAuditRoutes from './routes/socialAudit';
import agencyRoutes from './routes/agency';
import casesRoutes from './routes/cases';
import newsRoutes from './routes/news';
import notesRoutes from './routes/notes';
import publicAssetRoutes from './routes/public/assets';
import bannercraftRoutes from './routes/bannercraft';

const app = express();
const PORT = process.env.PORT || 4000;

import { startMocoSyncCron } from './services/cron';
// Start automated background MOCO sync
startMocoSyncCron();

// ── Middleware ───────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
allowedOrigins.push('https://px-bannercraft.labs-schickeria.com');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) or from allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));

// Quick db patch
import pool from './db';
pool.query('ALTER TABLE agency_tasks ADD COLUMN IF NOT EXISTS review_date DATE;')
  .then(() => console.log('DB: checked review_date'))
  .catch(e => console.error('DB patch err:', e.message));
pool.query('ALTER TABLE agency_tasks ADD COLUMN IF NOT EXISTS revision_date DATE;')
  .then(() => console.log('DB: checked revision_date'))
  .catch(e => console.error('DB patch err:', e.message));
pool.query('ALTER TABLE public.agency_client_contacts ADD COLUMN IF NOT EXISTS moco_contact_id INTEGER UNIQUE;')
  .then(() => console.log('DB: checked moco_contact_id'))
  .catch(e => console.error('DB patch err:', e.message));

pool.query('ALTER TABLE agency_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;')
  .then(() => console.log('DB: checked created_by on agency_tasks'))
  .catch(e => console.error('DB patch err:', e.message));

pool.query('ALTER TABLE agency_time_entries ADD COLUMN IF NOT EXISTS moco_activity_id INTEGER;')
  .then(() => console.log('DB: checked moco_activity_id on agency_time_entries'))
  .catch(e => console.error('DB patch err:', e.message));

pool.query(`
  ALTER TABLE agency_tasks 
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS show TEXT,
  ADD COLUMN IF NOT EXISTS formats TEXT[],
  ADD COLUMN IF NOT EXISTS legal_line TEXT,
  ADD COLUMN IF NOT EXISTS freigabelink TEXT,
  ADD COLUMN IF NOT EXISTS rights_expiration_date DATE,
  ADD COLUMN IF NOT EXISTS status_influencerclips BOOLEAN DEFAULT false;
`).then(() => console.log('DB: checked additional agency_tasks columns'))
  .catch(e => console.error('DB patch err:', e.message));
  
pool.query('ALTER TABLE public.agency_clients ADD COLUMN IF NOT EXISTS brands TEXT[] DEFAULT \'{}\';')
  .then(() => {
    console.log('DB: checked brands on agency_clients, seeding Warner...');
    return pool.query(`UPDATE public.agency_clients SET brands = ARRAY['DMAX', 'TLC', 'discovery+'] WHERE company_name ILIKE '%warner%' AND (brands IS NULL OR array_length(brands, 1) IS NULL);`);
  })
  .then(() => console.log('DB: Warner brands seeded'))
  .catch(e => console.error('DB patch brands err:', e.message));


// Verleihscheine Migration Patch
const verleihQueries = [
  "ALTER TABLE public.verleihscheine DROP CONSTRAINT IF EXISTS verleihscheine_borrower_type_check;",
  "ALTER TABLE public.verleihscheine ADD CONSTRAINT verleihscheine_borrower_type_check CHECK (borrower_type IN ('team', 'extern', 'client'));",
  "ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.agency_clients(id) ON DELETE SET NULL;",
  "ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS zustand_vorher TEXT;",
  "ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS zustand_nachher TEXT;",
  "ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS fotos_vorher TEXT[];",
  "ALTER TABLE public.verleihscheine ADD COLUMN IF NOT EXISTS fotos_nachher TEXT[];",
  "CREATE INDEX IF NOT EXISTS idx_verleihscheine_client ON public.verleihscheine(client_id);"
];

for (const q of verleihQueries) {
  pool.query(q).catch(e => console.error('DB Verleih patch err (may be benign if exists):', e.message));
}

pool.query(`
  CREATE TABLE IF NOT EXISTS public.notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      title TEXT,
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
`).then(() => console.log('DB: checked notes table'))
  .catch(e => console.error('DB notes patch err:', e.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS public.bannercraft_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
      project_name TEXT,
      state_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_bannercraft_user_id ON public.bannercraft_projects(user_id);
`).then(() => console.log('DB: checked bannercraft_projects table'))
  .catch(e => console.error('DB bannercraft patch err:', e.message));

pool.query('ALTER TABLE logins ADD COLUMN IF NOT EXISTS is_gf_only BOOLEAN DEFAULT false;')
  .then(() => {
    console.log('DB: checked is_gf_only on logins, setting GF and superadmin roles...');
    return Promise.all([
      pool.query(`
        UPDATE profiles 
        SET role = 'GF' 
        WHERE full_name ILIKE ANY(ARRAY['%Liena Nickel%', '%Amin Abousteit%', '%Matthias Selsam%'])
      `),
      pool.query(`
        UPDATE profiles 
        SET role = 'superadmin' 
        WHERE full_name ILIKE '%Sebastian Geller%'
      `)
    ]);
  })
  .then((res) => console.log('DB: GF roles updated:', res[0].rowCount, 'Superadmin updated:', res[1].rowCount))
  .catch(e => console.error('DB GF patch err:', e.message));

pool.query(`
  CREATE TABLE IF NOT EXISTS public.agency_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      firma TEXT NOT NULL,
      kategorie TEXT,
      bemerkung TEXT,
      website TEXT,
      benutzername TEXT,
      passwort TEXT,
      kundennummer TEXT,
      strasse TEXT,
      telefonnummer TEXT,
      email TEXT,
      sonstiges TEXT,
      dokumente TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_agency_accounts_firma ON public.agency_accounts(firma);
`).then(async () => {
  console.log('DB: checked agency_accounts table');
  try {
    const checkRes = await pool.query('SELECT COUNT(*)::integer as count FROM public.agency_accounts');
    if (checkRes.rows[0].count === 0) {
      const csvPath = path.join(process.cwd(), 'Accountliste.csv');
      if (fs.existsSync(csvPath)) {
        console.log('DB: seeding agency_accounts from CSV...');
        const rows: any[] = [];
        fs.createReadStream(csvPath)
          .pipe(csv({ mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/g, '') }))
          .on('data', (data) => rows.push(data))
          .on('end', async () => {
            try {
              for (const r of rows) {
                if (!r['FIRMA']) continue;
                await pool.query(
                  `INSERT INTO public.agency_accounts 
                   (firma, kategorie, bemerkung, website, benutzername, passwort, kundennummer, strasse, telefonnummer, email, sonstiges, dokumente)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                  [
                    r['FIRMA'],
                    r['Kategorie'] || null,
                    r['Bemerkung'] || null,
                    r['Website / Login'] || null,
                    r['BENUTZERNAME'] || null,
                    r['PASSWORT'] || null,
                    r['Kundennummer'] || null,
                    r['STRASSE'] || null,
                    r['TELEFONNUMMER'] || null,
                    r['EMAIL'] || null,
                    r['SONSTIGES'] || null,
                    r['Dokumente'] || null
                  ]
                );
              }
              console.log(`DB: successfully seeded ${rows.length} accounts from CSV`);
            } catch (seedErr: any) {
              console.error('DB: agency_accounts seeding failed:', seedErr.message);
            }
          });
      } else {
        console.log('DB: CSV file not found for seeding agency_accounts:', csvPath);
      }
    }
  } catch (err: any) {
    console.error('DB: failed to check/seed agency_accounts:', err.message);
  }
}).catch(e => console.error('DB agency_accounts table creation err:', e.message));

// Add robust endpoint tracking
app.use(express.urlencoded({ extended: true }));

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/sketches', sketchRoutes);
app.use('/api/texts', textRoutes);
app.use('/api/storyboards', storyboardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/models3d', models3dRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/i2audio', i2audioRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/openrouter', openrouterRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/creative', creativeAgentRoutes);
app.use('/api/social-audit', socialAuditRoutes);

// Agency App (ProjectFlow) Routes
app.use('/api', agencyRoutes); // Mounts /api/clients, /api/projects, etc. to match frontend exactly
app.use('/api/agency/cases', casesRoutes);
app.use('/api/news', newsRoutes); // News of the Day
app.use('/api/notes', notesRoutes);
app.use('/api/public/assets', publicAssetRoutes);
app.use('/api/bannercraft', bannercraftRoutes);

// Inventar
app.use('/api/inventar/items',            inventarItemRoutes);
app.use('/api/inventar/loans',            inventarLoanRoutes);
app.use('/api/inventar/verleihscheine',   inventarVerleihRoutes);
app.use('/api/inventar/links',            inventarLinkRoutes);
app.use('/api/inventar/logins',           inventarLoginRoutes);
app.use('/api/inventar/kreditkarten',     inventarKreditRoutes);
app.use('/api/inventar/handyvertraege',   inventarHandyRoutes);
app.use('/api/inventar/firmendaten',      inventarFirmaRoutes);
app.use('/api/inventar/dashboard-config', inventarDashboardRoutes);
app.use('/api/inventar/profiles',         inventarProfileRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[labs-api] Running on port ${PORT}`);
  console.log(`[labs-api] DB: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@')}`);
});
