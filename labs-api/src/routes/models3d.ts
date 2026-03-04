import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/models3d — get all 3D generations for current user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM generated_3d WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/models3d — save a generated 3D model
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { image_url, model_url, config } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO generated_3d (user_id, image_url, model_url, config)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, image_url, model_url, config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/models3d/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM generated_3d WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
