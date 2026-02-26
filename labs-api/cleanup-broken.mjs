/**
 * cleanup-broken.mjs — FULL SCAN (all tables, all URL columns)
 *
 * Checks every URL-containing column in labs_db for 404/broken links.
 * Also removes empty chat sessions.
 *
 * Usage:
 *   node cleanup-broken.mjs           → dry-run
 *   node cleanup-broken.mjs --delete  → actually deletes
 */

import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const DRY_RUN = !process.argv.includes('--delete');
const TIMEOUT_MS = 8000;

console.log(DRY_RUN
  ? '🔍 DRY-RUN mode — nothing will be deleted. Add --delete to actually delete.\n'
  : '⚠️  DELETE mode — broken records will be permanently removed.\n'
);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// ── URL check ─────────────────────────────────────────────────────────────────
// NOTE: R2/Cloudflare returns HTTP 200 for HEAD requests even on missing files
// (soft 404 with HTML page). We use GET and validate Content-Type is media.
async function isUrlBroken(url) {
  if (!url || url.trim() === '') return false; // null/empty = skip
  if (url.startsWith('data:'))               return false; // inline = skip
  if (!url.startsWith('http'))               return false; // not a URL = skip
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);

    if (res.status >= 400) return true; // hard 404/403

    // Check Content-Type — R2 soft-404s return text/html, real assets return image/* or video/*
    const ct = res.headers.get('content-type') || '';
    const isMedia = ct.startsWith('image/') || ct.startsWith('video/') || ct.startsWith('application/octet');
    return !isMedia;
  } catch {
    return true;
  }
}

// ── Generic table check ───────────────────────────────────────────────────────
async function cleanTable({ label, table, urlColumn, deleteWhere }) {
  console.log(`\n📋 ${label}`);
  const { rows } = await pool.query(
    `SELECT id, ${urlColumn} FROM ${table} WHERE ${urlColumn} IS NOT NULL AND ${urlColumn} NOT LIKE 'data:%'`
  );
  if (rows.length === 0) { console.log('   (no records)'); return 0; }

  const broken = [];
  for (const row of rows) {
    const url = row[urlColumn];
    process.stdout.write(`   ${url.slice(0, 72)}... `);
    if (await isUrlBroken(url)) {
      console.log('❌ BROKEN');
      broken.push(row.id);
    } else {
      console.log('✅ ok');
    }
  }
  console.log(`   → ${broken.length} broken / ${rows.length} total`);

  if (broken.length > 0) {
    const where = deleteWhere || `id = ANY($1::uuid[])`;
    if (!DRY_RUN) {
      await pool.query(`DELETE FROM ${table} WHERE ${where}`, [broken]);
      console.log(`   🗑️  Deleted ${broken.length} records`);
    } else {
      console.log(`   [dry-run] Would delete ${broken.length} records`);
    }
  }
  return broken.length;
}

// ── JSONB URL check (storyboard assets) ──────────────────────────────────────
async function cleanStoryboardAssets() {
  console.log('\n📋 Storyboard assets (JSONB url fields)');
  const { rows } = await pool.query(`SELECT id, assets FROM storyboard_sessions WHERE assets IS NOT NULL AND assets != '[]'::jsonb`);
  if (rows.length === 0) { console.log('   (no records)'); return 0; }

  const bad = [];
  for (const row of rows) {
    const assets = Array.isArray(row.assets) ? row.assets : [];
    for (const asset of assets) {
      const url = asset?.url || asset?.image_url || asset?.video_url;
      if (url && await isUrlBroken(url)) {
        process.stdout.write(`   ${url.slice(0, 72)}... ❌ BROKEN → storyboard ${row.id}\n`);
        if (!bad.includes(row.id)) bad.push(row.id);
      }
    }
  }
  console.log(`   → ${bad.length} storyboards with broken asset URLs`);
  if (bad.length > 0 && !DRY_RUN) {
    // Don't delete whole storyboard — just note it for now
    console.log('   ⚠️  Storyboards not deleted (contain other data). Review manually in DBeaver.');
  }
  return bad.length;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let totalBroken = 0;
  try {

    // 1. Generated Images
    totalBroken += await cleanTable({
      label: 'Images → generated_images.image_url',
      table: 'generated_images',
      urlColumn: 'image_url',
    });

    // 2. Generated Thumbnails
    totalBroken += await cleanTable({
      label: 'Thumbnails → generated_thumbnails.image_url',
      table: 'generated_thumbnails',
      urlColumn: 'image_url',
    });

    // 3. Generated Videos → video_url
    totalBroken += await cleanTable({
      label: 'Videos → generated_videos.video_url',
      table: 'generated_videos',
      urlColumn: 'video_url',
    });

    // 4. Generated Videos → thumbnail_url (optional column)
    console.log('\n📋 Video thumbnails → generated_videos.thumbnail_url');
    const { rows: vids } = await pool.query(
      `SELECT id, thumbnail_url FROM generated_videos WHERE thumbnail_url IS NOT NULL AND thumbnail_url NOT LIKE 'data:%'`
    );
    for (const row of vids) {
      process.stdout.write(`   ${row.thumbnail_url.slice(0, 72)}... `);
      if (await isUrlBroken(row.thumbnail_url)) {
        console.log('❌ BROKEN → cleared thumbnail_url');
        if (!DRY_RUN) {
          await pool.query(`UPDATE generated_videos SET thumbnail_url = NULL WHERE id = $1`, [row.id]);
        } else {
          console.log('   [dry-run] Would NULL out thumbnail_url');
        }
        totalBroken++;
      } else {
        console.log('✅ ok');
      }
    }
    if (vids.length === 0) console.log('   (no records)');

    // 5. Sketches → generated_image_url
    totalBroken += await cleanTable({
      label: 'Sketches (generated image) → generated_sketches.generated_image_url',
      table: 'generated_sketches',
      urlColumn: 'generated_image_url',
    });

    // 6. Sketches → sketch_data (can be a URL or base64)
    console.log('\n📋 Sketches (drawing) → generated_sketches.sketch_data');
    const { rows: sketches } = await pool.query(
      `SELECT id, sketch_data FROM generated_sketches WHERE sketch_data IS NOT NULL AND sketch_data LIKE 'http%'`
    );
    const brokenSketches = [];
    for (const row of sketches) {
      process.stdout.write(`   ${row.sketch_data.slice(0, 72)}... `);
      if (await isUrlBroken(row.sketch_data)) {
        console.log('❌ BROKEN');
        brokenSketches.push(row.id);
      } else { console.log('✅ ok'); }
    }
    console.log(`   → ${brokenSketches.length} broken / ${sketches.length} total`);
    if (brokenSketches.length > 0) {
      if (!DRY_RUN) {
        await pool.query(`DELETE FROM generated_sketches WHERE id = ANY($1::uuid[])`, [brokenSketches]);
        console.log(`   🗑️  Deleted ${brokenSketches.length} sketch records`);
      } else {
        console.log(`   [dry-run] Would delete ${brokenSketches.length} sketch records`);
      }
      totalBroken += brokenSketches.length;
    }
    if (sketches.length === 0) console.log('   (no URL-based sketch_data)');

    // 7. Profiles → avatar_url
    console.log('\n📋 Profiles → profiles.avatar_url');
    const { rows: profiles } = await pool.query(
      `SELECT id, email, avatar_url FROM profiles WHERE avatar_url IS NOT NULL AND avatar_url LIKE 'http%'`
    );
    for (const row of profiles) {
      process.stdout.write(`   [${row.email}] ${row.avatar_url.slice(0, 60)}... `);
      if (await isUrlBroken(row.avatar_url)) {
        console.log('❌ BROKEN → cleared');
        if (!DRY_RUN) {
          await pool.query(`UPDATE profiles SET avatar_url = NULL WHERE id = $1`, [row.id]);
        }
        totalBroken++;
      } else { console.log('✅ ok'); }
    }
    if (profiles.length === 0) console.log('   (no records)');

    // 8. Storyboard assets (JSONB)
    await cleanStoryboardAssets();

    // 9. Empty Chat Sessions
    console.log('\n📋 Empty Chat Sessions');
    const { rows: chats } = await pool.query(
      `SELECT id, title, bot_id FROM chat_sessions WHERE messages = '[]'::jsonb OR jsonb_array_length(messages) = 0`
    );
    console.log(`   → ${chats.length} empty sessions`);
    if (chats.length > 0) {
      chats.forEach(c => console.log(`     - [${c.bot_id}] "${c.title || '(untitled)'}"`));
      if (!DRY_RUN) {
        await pool.query(`DELETE FROM chat_sessions WHERE messages = '[]'::jsonb OR jsonb_array_length(messages) = 0`);
        console.log(`   🗑️  Deleted ${chats.length} empty sessions`);
      } else {
        console.log(`   [dry-run] Would delete ${chats.length} empty sessions`);
      }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Done! Total broken found: ${totalBroken}`);
    if (DRY_RUN && totalBroken > 0) {
      console.log(`   Run with --delete to actually remove them.\n`);
    }
    console.log('');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
