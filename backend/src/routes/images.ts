import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/images — get all images for current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM generated_images WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/images — save a generated image
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { prompt, style, image_url, config } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO generated_images (user_id, prompt, style, image_url, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, prompt, style, image_url, config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/images/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM generated_images WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
