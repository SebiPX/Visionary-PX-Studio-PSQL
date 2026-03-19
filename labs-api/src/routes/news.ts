import { Router } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';
import { curateAiNews } from '../services/aiNewsCurator';

const router = Router();

// GET /api/news
// Fetch active news ordered by publish_date DESC
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { type, all } = req.query;
  try {
    let query = `SELECT * FROM agency_news WHERE 1=1`;
    const params: any[] = [];
    
    // Default to only active news unless specifically requested
    if (all !== 'true') {
      query += ` AND is_active = true AND publish_date <= NOW()`;
    }

    if (type === 'internal' || type === 'external') {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    query += ` ORDER BY publish_date DESC`;
    if (all !== 'true') {
       query += ` LIMIT 50`; // Limit to latest 50 for regular feed
    }

    const { rows } = await pool.query(query, params);

    // Auto-Curate Background Task
    // If we're fetching the standard dashboard feed, check if we lack today's AI news.
    if (all !== 'true' && (!type || type === 'external')) {
       const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
       const hasRecentAiNews = rows.some((r: any) => 
          r.type === 'external' && new Date(r.publish_date).getTime() > twentyFourHoursAgo
       );
       if (!hasRecentAiNews) {
          // Trigger curation in the background so we don't block the dashboard loading!
          console.log('[News] No recent AI news found. Triggering background curation...');
          curateAiNews().catch(err => console.error('[News] Auto-curation failed:', err));
       }
    }

    res.json(rows);
  } catch (err: any) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// POST /api/news (Admin only implicitly, or simple auth required)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { title, content, type, publish_date, is_active } = req.body;
  
  if (!title || !content || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO agency_news (title, content, type, publish_date, is_active)
       VALUES ($1, $2, $3, COALESCE($4, NOW()), COALESCE($5, TRUE))
       RETURNING *`,
      [title, content, type, publish_date || null, is_active ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

// POST /api/news/curate (Trigger AI Curated News)
router.post('/curate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const news = await curateAiNews();
    res.status(200).json({ message: 'News curated successfully', news });
  } catch (err: any) {
    console.error('Error curating news:', err);
    res.status(500).json({ error: 'Failed to curate news: ' + err.message });
  }
});

// PUT /api/news/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, content, type, publish_date, is_active } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE agency_news
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           type = COALESCE($3, type),
           publish_date = COALESCE($4, publish_date),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, content, type, publish_date, is_active, id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'News not found' });
    res.json(rows[0]);
  } catch (err: any) {
    console.error('Error updating news:', err);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

// DELETE /api/news/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(`DELETE FROM agency_news WHERE id = $1`, [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'News not found' });
    res.status(204).send();
  } catch (err: any) {
    console.error('Error deleting news:', err);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

export default router;
