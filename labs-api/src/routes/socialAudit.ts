import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';
import pool from '../db';

const router = Router();

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
// Generates mock posts and metrics for a given account
router.post('/sync/:accountId', requireAuth, async (req: AuthRequest, res: Response) => {
    const { accountId } = req.params;
    try {
        // Check if account exists
        const accountRes = await pool.query('SELECT * FROM social_accounts WHERE id = $1', [accountId]);
        if (accountRes.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const account = accountRes.rows[0];

        // Generate 5 mock posts
        const mockPosts = Array.from({ length: 5 }).map((_, i) => ({
            external_id: `${account.platform}_mock_${Date.now()}_${i}`,
            media_url: `https://picsum.photos/seed/${Date.now() + i}/400/600`, // Random placeholder image
            caption: `Mock post number ${i + 1} for ${account.username} #socialmedia #test`,
            post_type: account.platform === 'tiktok' ? 'video' : (i % 2 === 0 ? 'reel' : 'carousel'),
            published_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
            likes: Math.floor(Math.random() * 5000),
            shares: Math.floor(Math.random() * 500),
            comments_count: Math.floor(Math.random() * 200),
            reach: Math.floor(Math.random() * 20000) + 5000,
        }));

        const insertedPosts = [];

        await pool.query('BEGIN');

        for (const post of mockPosts) {
            // Insert Post
            const postRes = await pool.query(
                `INSERT INTO social_posts (account_id, external_id, media_url, caption, post_type, published_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [accountId, post.external_id, post.media_url, post.caption, post.post_type, post.published_at]
            );
            
            const newPostId = postRes.rows[0].id;
            insertedPosts.push(postRes.rows[0]);

            // Calculate Engagement Rate
            const engagementRate = post.reach > 0 ? ((post.likes + post.comments_count + post.shares) / post.reach) * 100 : 0;

            // Insert Metrics
            await pool.query(
                `INSERT INTO social_metrics (post_id, likes, shares, comments_count, reach, engagement_rate)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [newPostId, post.likes, post.shares, post.comments_count, post.reach, engagementRate]
            );
        }

        // Update last_sync on account
        await pool.query('UPDATE social_accounts SET last_sync = NOW() WHERE id = $1', [accountId]);

        await pool.query('COMMIT');

        res.json({ success: true, message: `Synced ${insertedPosts.length} mock posts.` });

    } catch (err: any) {
        await pool.query('ROLLBACK');
        console.error('[social_audit mock_sync]', err);
        res.status(500).json({ error: err.message });
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
        
        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE social_ai_analysis 
                 SET sentiment = $2, detected_patterns = $3, summary_text = $4
                 WHERE post_id = $1
                 RETURNING *`,
                [post_id, sentiment, detected_patterns || '{}', summary_text]
            );
        } else {
            result = await pool.query(
                `INSERT INTO social_ai_analysis (post_id, sentiment, detected_patterns, summary_text)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [post_id, sentiment, detected_patterns || '{}', summary_text]
            );
        }

        res.json(result.rows[0]);
    } catch (err: any) {
        console.error('[social_audit save_analysis]', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
