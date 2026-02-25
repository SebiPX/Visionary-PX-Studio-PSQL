import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM generated_texts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { prompt, content, type, config } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO generated_texts (user_id, prompt, content, type, config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, prompt, content, type, config || {}]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM generated_texts WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
