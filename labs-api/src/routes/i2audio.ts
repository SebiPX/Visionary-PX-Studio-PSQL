import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/i2audio - Fetch history for current user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await pool.query(
      'SELECT * FROM generated_i2audio WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching i2audio history:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/i2audio - Generate/Save new video metadata
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { prompt, video_url, config } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: 'Missing video_url' });
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
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM generated_i2audio WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting i2audio:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export const i2audioRoutes = router;
