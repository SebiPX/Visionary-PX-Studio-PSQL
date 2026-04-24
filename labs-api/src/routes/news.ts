import { Router } from 'express';
import pool from '../db';
import aiNewsPool from '../aiNewsDb';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/news
// Fetch active news ordered by publish_date DESC
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { type, all } = req.query;
  try {
    const fetchInternal = type === 'internal' || !type;
    const fetchExternal = type === 'external' || !type;
    
    let combinedNews: any[] = [];

    // 1. Fetch Internal News
    if (fetchInternal) {
      let query = `SELECT * FROM agency_news WHERE type = 'internal'`;
      if (all !== 'true') {
        query += ` AND is_active = true AND publish_date <= NOW()`;
      }
      query += ` ORDER BY publish_date DESC`;
      if (all !== 'true') {
         query += ` LIMIT 50`;
      }
      const { rows } = await pool.query(query);
      combinedNews = combinedNews.concat(rows);
    }

    // 2. Fetch External AI News
    if (fetchExternal) {
      const feed = req.query.feed as string;
      let viewName = 'ai_news_daily_priority_safe'; // default
      if (feed === 'client') viewName = 'ai_news_client_relevant_safe';
      if (feed === 'risk') viewName = 'ai_news_risk_watch_safe';

      let query = '';
      if (feed === 'daily' || !feed) {
        query = `SELECT * FROM ${viewName} ORDER BY priority_score DESC, published_at DESC NULLS LAST, id DESC LIMIT 50`;
      } else {
        query = `SELECT * FROM ${viewName} ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 50`;
      }
      const { rows } = await aiNewsPool.query(query);
      
      const mappedExternalNews = rows.map((row: any) => {
        let contentMarkdown = `**Kategorie:** ${row.category} | **Quelle:** [${row.source_name}](${row.source_url})\n\n**Zusammenfassung:**\n${row.summary}\n\n**Bedeutung:**\n${row.significance}`;

        return {
          id: `ext-${row.id}`, // prefix to avoid id collision
          title: row.title,
          content: contentMarkdown,
          type: 'external',
          publish_date: row.published_at || row.discovered_at,
          is_active: true,
          created_at: row.discovered_at,
          updated_at: row.discovered_at,
          thumbnail: row.thumbnail_url || (row.raw_payload?.thumbnail_url),
          quality_score: row.impact_score || row.quality_score || (row.raw_payload?.quality_score) || 1.0,
          topic: row.topic,
          impact_score: row.impact_score,
          business_relevance: row.business_relevance,
          region: row.region,
          audience: row.audience,
          action_hint: row.action_hint
        };
      });
      
      combinedNews = combinedNews.concat(mappedExternalNews);
    }

    // Sort combined by publish_date DESC
    combinedNews.sort((a, b) => {
      const dateA = new Date(a.publish_date || a.created_at).getTime();
      const dateB = new Date(b.publish_date || b.created_at).getTime();
      return dateB - dateA;
    });

    if (all !== 'true') {
      combinedNews = combinedNews.slice(0, 50); // Keep overall limit
    }

    res.json(combinedNews);
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

  // We only allow creating internal news now, as external comes from ai_news db.
  const actualType = type === 'external' ? 'internal' : type;

  try {
    const { rows } = await pool.query(
      `INSERT INTO agency_news (title, content, type, publish_date, is_active)
       VALUES ($1, $2, $3, COALESCE($4, NOW()), COALESCE($5, TRUE))
       RETURNING *`,
      [title, content, actualType, publish_date || null, is_active ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error('Error creating news:', err);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

// PUT /api/news/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { title, content, type, publish_date, is_active } = req.body;

  // External news can't be edited here
  if (typeof id === 'string' && id.startsWith('ext-')) {
    return res.status(403).json({ error: 'External news cannot be edited from this interface.' });
  }

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
  
  if (typeof id === 'string' && id.startsWith('ext-')) {
    return res.status(403).json({ error: 'External news cannot be deleted from this interface.' });
  }

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
