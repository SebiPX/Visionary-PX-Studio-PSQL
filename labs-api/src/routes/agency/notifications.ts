import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/notifications/my
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM agency_notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/notifications
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { user_id, type, title, message, link, related_entity_id, related_entity_type } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_notifications 
        (user_id, type, title, message, link, related_entity_id, related_entity_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, type, title, message, link, related_entity_id, related_entity_type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/notifications/my/read-all
router.put('/my/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      `UPDATE agency_notifications 
       SET is_read = true 
       WHERE user_id = $1 AND is_read = false`,
      [req.userId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/notifications/:id/read
router.put('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `UPDATE agency_notifications 
       SET is_read = true 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
