/**
 * migrate-storage.mjs
 *
 * Kopiert alle Dateien von Supabase Storage nach Cloudflare R2
 * und aktualisiert die URLs in labs_db.
 *
 * Voraussetzungen (einmalig installieren):
 *   npm install @aws-sdk/client-s3 pg dotenv node-fetch
 *
 * Aufruf:
 *   node migrate-storage.mjs
 *
 * .env Variablen benötigt:
 *   DATABASE_URL          ← labs_db PostgreSQL Connection String
 *   SUPABASE_STORAGE_URL  ← z.B. https://api.labs-schickeria.com:8000/storage/v1
 *   R2_ENDPOINT           ← https://xxx.r2.cloudflarestorage.com
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_BASE_URL    ← https://pub-xxx.r2.dev
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';
import dotenv from 'dotenv';
import { basename } from 'path';
import https from 'https';

// ── Bypass SSL for self-hosted Supabase (self-signed cert) ────────────
const sslAgent = new https.Agent({ rejectUnauthorized: false });

dotenv.config();

// ── Validate required env vars ────────────────────────────────────────
const required = ['DATABASE_URL', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing.join(', '));
  console.error('   Add them to the .env file in this directory or export them before running.');
  process.exit(1);
}

const { Pool } = pg;
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: false — PostgreSQL runs locally without SSL
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});


const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const R2_BASE = process.env.R2_PUBLIC_BASE_URL;

// ── Helper: Download a file from any URL ─────────────────────────────
async function downloadFile(url) {
  const res = await fetch(url, { agent: url.startsWith('https') ? sslAgent : undefined });
  if (!res.ok) throw new Error(`Download failed: ${url} → HTTP ${res.status}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get('content-type') || 'application/octet-stream' };
}

// ── Helper: Upload buffer to R2 ──────────────────────────────────────
async function uploadToR2(key, buffer, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${R2_BASE}/${key}`;
}

// ── Helper: Determine R2 key from Supabase URL ───────────────────────
function getR2Key(supabaseUrl) {
  // Extract the path after generated_assets/
  const match = supabaseUrl.match(/generated_assets\/(.+)/);
  if (!match) throw new Error(`Cannot parse URL: ${supabaseUrl}`);
  return `generated_assets/${match[1]}`;
}

// ── Migrate a table ──────────────────────────────────────────────────
async function migrateTable(table, urlColumn) {
  console.log(`\n📋 Migrating ${table}.${urlColumn}...`);
  const { rows } = await db.query(`SELECT id, ${urlColumn} FROM ${table} WHERE ${urlColumn} LIKE '%:8000%' OR ${urlColumn} LIKE '%supabase%'`);
  console.log(`   Found ${rows.length} rows to migrate`);

  let success = 0, failed = 0;
  for (const row of rows) {
    const oldUrl = row[urlColumn];
    if (!oldUrl) continue;
    try {
      const r2Key = getR2Key(oldUrl);
      console.log(`   ↓ ${basename(r2Key)}`);
      const { buffer, contentType } = await downloadFile(oldUrl);
      const newUrl = await uploadToR2(r2Key, buffer, contentType);
      await db.query(`UPDATE ${table} SET ${urlColumn} = $1 WHERE id = $2`, [newUrl, row.id]);
      console.log(`   ✅ → ${newUrl}`);
      success++;
    } catch (err) {
      console.error(`   ❌ Row ${row.id}: ${err.message}`);
      failed++;
    }
  }
  console.log(`   Done: ${success} migrated, ${failed} failed`);
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Supabase Storage → Cloudflare R2 Migration');
  console.log(`   DB: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':***@')}`);
  console.log(`   R2: ${BUCKET} @ ${R2_BASE}\n`);

  try {
    // Migrate each content type
    await migrateTable('generated_images',    'image_url');
    await migrateTable('generated_videos',    'video_url');
    await migrateTable('generated_videos',    'thumbnail_url');
    await migrateTable('generated_thumbnails','image_url');
    await migrateTable('generated_sketches',  'generated_image_url');
    await migrateTable('profiles',            'avatar_url');

    // Storyboard sessions have JSON — handled separately
    await migrateStoryboards();

    console.log('\n✅ Migration complete!');
  } finally {
    await db.end();
  }
}

// ── Storyboard sessions (JSON with nested image URLs) ────────────────
async function migrateStoryboards() {
  console.log('\n📋 Migrating storyboard_sessions (JSON)...');
  
  // Find the correct JSON column name
  const { rows: cols } = await db.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'storyboard_sessions'
  `);
  const colNames = cols.map(r => r.column_name);
  console.log('   Columns:', colNames.join(', '));
  
  // Find which column holds the JSON data (shots/scenes/content/data)
  const jsonCol = ['scenes', 'shots', 'content', 'data', 'session_data'].find(c => colNames.includes(c));
  if (!jsonCol) {
    console.log('   ⚠️  No JSON column found in storyboard_sessions — skipping');
    return;
  }
  console.log(`   Using column: ${jsonCol}`);
  
  const { rows } = await db.query(`SELECT id, ${jsonCol} FROM storyboard_sessions WHERE ${jsonCol}::text LIKE '%:8000%' OR ${jsonCol}::text LIKE '%supabase%'`);
  console.log(`   Found ${rows.length} sessions to migrate`);

  for (const row of rows) {
    try {
      const json = typeof row[jsonCol] === 'string' ? JSON.parse(row[jsonCol]) : row[jsonCol];
      let modified = false;

      // Walk through shots/scenes and migrate image URLs
      const items = json.shots || json.scenes || [];
      for (const shot of items) {
        if (shot.image_url && (shot.image_url.includes(':8000') || shot.image_url.includes('supabase'))) {
          const r2Key = getR2Key(shot.image_url);
          const { buffer, contentType } = await downloadFile(shot.image_url);
          shot.image_url = await uploadToR2(r2Key, buffer, contentType);
          modified = true;
        }
      }

      if (modified) {
        await db.query(`UPDATE storyboard_sessions SET ${jsonCol} = $1 WHERE id = $2`, [JSON.stringify(json), row.id]);
        console.log(`   ✅ Session ${row.id}`);
      }
    } catch (err) {
      console.error(`   ❌ Session ${row.id}: ${err.message}`);
    }
  }
}

main().catch(console.error);
