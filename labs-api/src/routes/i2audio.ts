import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';
import pool from '../db';

const router = Router();

// GET /api/i2audio - Fetch history for current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await pool.query(
      'SELECT * FROM generated_i2audio WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching i2audio history:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/i2audio - Generate/Save new video metadata
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { prompt, video_url, config } = req.body;

    if (!video_url) {
      res.status(400).json({ error: 'Missing video_url' });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO generated_i2audio (user_id, prompt, video_url, config)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, prompt || '', video_url, config || {}]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error('Error saving i2audio:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/i2audio/:id - Delete an item
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM generated_i2audio WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Item not found or unauthorized' });
      return;
    }

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting i2audio:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const i2audioRoutes = router;
