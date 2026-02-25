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

import pg from 'pg';
import dotenv from 'dotenv';
import { basename, extname } from 'path';
import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

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


const BUCKET = process.env.R2_BUCKET_NAME.trim();
const R2_BASE = process.env.R2_PUBLIC_BASE_URL.trim().replace(/\/$/, '');
// e.g. https://42e817feef1a0fe73189800cbbe001d7.r2.cloudflarestorage.com
const R2_S3_ENDPOINT = process.env.R2_ENDPOINT.trim().replace(/\/$/, '');


// ── Helper: Download a file using curl (bypasses TLS compat issues) ──
function downloadFile(url) {
  const ext = extname(url).toLowerCase();
  const contentTypeMap = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  // curl -s -L -k: silent, follow redirects, ignore SSL errors
  // maxBuffer: 500MB to handle large video files
  const buffer = execFileSync('curl', ['-s', '-L', '-k', url], { maxBuffer: 500 * 1024 * 1024 });
  if (!buffer || buffer.length === 0) throw new Error(`Empty response from: ${url}`);
  return { buffer, contentType };
}

// ── Helper: Upload buffer to R2 via curl --aws-sigv4 ─────────────────
// Uses system OpenSSL (curl) instead of Node.js TLS to avoid handshake issues
function uploadToR2(key, buffer, contentType) {
  const tmpFile = `${tmpdir()}/r2_upload_${Date.now()}`;
  writeFileSync(tmpFile, buffer);
  try {
    const url = `${R2_S3_ENDPOINT}/${BUCKET}/${key}`;
    // Note: do NOT add x-amz-content-sha256 manually — --aws-sigv4 handles it
    execFileSync('curl', [
      '--aws-sigv4', 'aws:amz:auto:s3',
      '--user', `${process.env.R2_ACCESS_KEY_ID.trim()}:${process.env.R2_SECRET_ACCESS_KEY.trim()}`,
      '-X', 'PUT',
      '-T', tmpFile,
      '-H', `Content-Type: ${contentType}`,
      '-s', '-f', '-k',
      url,
    ], { maxBuffer: 10 * 1024 }); // response body is small
    return `${R2_BASE}/${key}`;
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }
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
      const { buffer, contentType } = downloadFile(oldUrl);
      const newUrl = uploadToR2(r2Key, buffer, contentType);
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
          const { buffer, contentType } = downloadFile(shot.image_url);
          shot.image_url = uploadToR2(r2Key, buffer, contentType);
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
