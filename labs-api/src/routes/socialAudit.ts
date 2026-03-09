import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';
import pool from '../db';
import { ApifyClient } from 'apify-client';

const router = Router();
const apifyClient = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// ============================================================================
// ACCOUNTS
// ============================================================================

// GET /api/social-audit/accounts
router.get('/accounts', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT * FROM social_accounts ORDER BY id ASC'
        );
        res.json(result.rows);
    } catch (err: any) {
        console.error('[social_audit get_accounts]', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/social-audit/accounts
router.post('/accounts', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { platform, username, access_token } = req.body;
        
        if (!platform || !username) {
            return res.status(400).json({ error: 'platform and username are required' });
        }

        const result = await pool.query(
            `INSERT INTO social_accounts (platform, username, access_token)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [platform, username, access_token || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('[social_audit create_account]', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// MOCK SYNC (DATA GENERATION)
// ============================================================================

// POST /api/social-audit/sync/:accountId
// Synchronizes posts and metrics for a given account via Apify
router.post('/sync/:accountId', requireAuth, async (req: AuthRequest, res: Response) => {
    const { accountId } = req.params;
    try {
        // Check if account exists
        const accountRes = await pool.query('SELECT * FROM social_accounts WHERE id = $1', [accountId]);
        if (accountRes.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const account = accountRes.rows[0];
        const platform = account.platform;
        const username = account.username;

        if (!process.env.APIFY_API_TOKEN) {
             return res.status(500).json({ error: 'APIFY_API_TOKEN is not configured in backend.' });
        }

        console.log(`[social_audit sync] Starting Apify sync for ${platform} user: ${username}`);

        let actorId = '';
        let input = {};

        if (platform === 'instagram') {
            actorId = 'apify/instagram-profile-scraper';
            input = {
                usernames: [username],
                resultsLimit: 15,
            };
        } else if (platform === 'tiktok') {
             // Example using clockworks/tiktok-profile-scraper
            actorId = 'clockworks/tiktok-profile-scraper';
            input = {
                profiles: [username],
                resultsPerPage: 15,
                shouldDownloadVideos: false,
                shouldDownloadCovers: true
            };
        } else {
             return res.status(400).json({ error: 'Unsupported platform for sync' });
        }

        // Run the Actor and wait for it to finish
        const run = await apifyClient.actor(actorId).call(input);
        
        console.log(`[social_audit sync] Apify run complete. Fetching dataset items...`);
        // Fetch results from the run's dataset
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        if (!items || items.length === 0) {
            return res.status(200).json({ success: true, message: 'Sync complete, but no posts found.', count: 0 });
        }

        const postsArray = items.flatMap(itemAny => {
            const i = itemAny as any;
            if (platform === 'instagram' && i.latestPosts && Array.isArray(i.latestPosts)) {
                return i.latestPosts.map((p: any) => ({ ...p, __profileFollowers: i.followersCount || i.edge_followed_by?.count || 0 }));
            }
            if (platform === 'tiktok' && i.videos && Array.isArray(i.videos)) {
                return i.videos.map((v: any) => ({ ...v, __profileFollowers: i.authorMeta?.fans || i.userInfo?.stats?.followerCount || 0 }));
            }
            if (i.id || i.shortCode || i.videoMeta) return [i]; // Fallback
            return [];
        });

        console.log(`[social_audit sync] Extracted ${postsArray.length} posts from ${items.length} profile(s). Processing...`);

        const insertedPosts = [];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const itemAny of postsArray) {
               const item = itemAny as any;
               let externalId, mediaUrl, caption, postType, publishedAt;
               let likes = 0, commentsCount = 0, shares = 0, reach = 0;

               if (platform === 'instagram') {
                   externalId = item.id || item.shortCode || `${username}_${Date.now()}`;
                   mediaUrl = item.displayUrl || item.videoUrl || '';
                   caption = item.caption || '';
                   postType = item.type === 'Video' ? 'reel' : (item.type === 'Sidecar' ? 'carousel' : 'image');
                   publishedAt = item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString();
                   
                   likes = item.likesCount || 0;
                   commentsCount = item.commentsCount || 0;
                   shares = 0; 
                   reach = item.videoPlayCount || 0; // Better if we have a real play count
               } else if (platform === 'tiktok') {
                   externalId = item.id || item.videoMeta?.id || `${username}_${Date.now()}`;
                   mediaUrl = item.videoMeta?.coverUrl || item.covers?.[0] || '';
                   caption = item.text || item.desc || '';
                   postType = 'video';
                   publishedAt = item.createTime ? new Date(item.createTime * 1000).toISOString() : new Date().toISOString();
                   
                   likes = item.diggCount || item.stats?.diggCount || 0;
                   commentsCount = item.commentCount || item.stats?.commentCount || 0;
                   shares = item.shareCount || item.stats?.shareCount || 0;
                   reach = item.playCount || item.stats?.playCount || 0;
               }

                // Upsert Post
                const postRes = await client.query(
                    `INSERT INTO social_posts (account_id, external_id, media_url, caption, post_type, published_at)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (external_id) DO UPDATE 
                     SET media_url = EXCLUDED.media_url, caption = EXCLUDED.caption, 
                         post_type = EXCLUDED.post_type, published_at = EXCLUDED.published_at
                     RETURNING id`,
                    [accountId, externalId, mediaUrl, caption, postType, publishedAt]
                );
                
                const newPostId = postRes.rows[0].id;
                insertedPosts.push(newPostId);

                // Calculate Engagement Rate
                // Industry standard: (Interactions / Followers) * 100
                const interactions = likes + commentsCount + shares;
                const followers = item.__profileFollowers || 0;
                let engagementRate = 0;
                
                if (followers > 0) {
                    engagementRate = (interactions / followers) * 100;
                } else if (reach > 0) {
                    // Fallback to reach if follower count is missing
                    engagementRate = (interactions / reach) * 100;
                }

                // Try to find if metrics exist for this post today
                const checkMetrics = await client.query('SELECT id FROM social_metrics WHERE post_id = $1 AND DATE(captured_at) = CURRENT_DATE', [newPostId]);

                if (checkMetrics.rows.length === 0) {
                    // Insert New Metrics Snapshot
                    await client.query(
                        `INSERT INTO social_metrics (post_id, likes, shares, comments_count, reach, engagement_rate)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [newPostId, likes, shares, commentsCount, reach, Math.min(engagementRate, 100)]
                    );
                }
            }

            // Update last_sync on account
            await client.query('UPDATE social_accounts SET last_sync = NOW() WHERE id = $1', [accountId]);

            await client.query('COMMIT');

            res.json({ success: true, message: `Synced ${insertedPosts.length} posts via Apify.`, count: insertedPosts.length });

        } catch (dbErr: any) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err: any) {
        console.error('===================================================');
        console.error('[social_audit sync fatal error]');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        if (err.code) console.error('DB Error Code:', err.code);
        if (err.detail) console.error('DB Error Detail:', err.detail);
        console.error('===================================================');
        res.status(500).json({ error: err.message, stack: err.stack, detail: err.detail });
    }
});

// ============================================================================
// POSTS & METRICS
// ============================================================================

// GET /api/social-audit/posts/:accountId
// Fetches posts along with their latest metrics and AI analysis
router.get('/posts/:accountId', requireAuth, async (req: AuthRequest, res: Response) => {
    const { accountId } = req.params;
    try {
        const result = await pool.query(
            `SELECT p.*, 
                    m.likes, m.shares, m.comments_count, m.reach, m.engagement_rate,
                    a.sentiment, a.detected_patterns, a.summary_text
             FROM social_posts p
             LEFT JOIN social_metrics m ON m.post_id = p.id
             LEFT JOIN social_ai_analysis a ON a.post_id = p.id
             WHERE p.account_id = $1
             ORDER BY m.engagement_rate DESC NULLS LAST`,
            [accountId]
        );
        res.json(result.rows);
    } catch (err: any) {
        console.error('[social_audit get_posts]', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// AI ANALYSIS (STUB - Will be called from frontend using Gemini Proxy)
// ============================================================================

// POST /api/social-audit/analysis
// Save AI analysis results back to the database
router.post('/analysis', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
        const { post_id, sentiment, detected_patterns, summary_text } = req.body;

        if (!post_id) {
            return res.status(400).json({ error: 'post_id is required' });
        }

        // Upsert analysis manually since we don't have UNIQUE(post_id) constraint guaranteed
        const existing = await pool.query('SELECT id FROM social_ai_analysis WHERE post_id = $1', [post_id]);
        
        const patternsJson = typeof detected_patterns === 'string' 
            ? detected_patterns 
            : JSON.stringify(detected_patterns || []);

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE social_ai_analysis 
                 SET sentiment = $2, detected_patterns = $3, summary_text = $4
                 WHERE post_id = $1
                 RETURNING *`,
                [post_id, sentiment, patternsJson, summary_text]
            );
        } else {
            result = await pool.query(
                `INSERT INTO social_ai_analysis (post_id, sentiment, detected_patterns, summary_text)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [post_id, sentiment, patternsJson, summary_text]
            );
        }

        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('[social_audit save_analysis]', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
