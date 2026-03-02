import { Router, Response } from 'express';
import pool from '../db';
import { AuthRequest, requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/storyboards
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM storyboard_sessions WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/storyboards — create or update (upsert by id)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id, title, concept, target_duration, num_shots, config, assets, shots } = req.body;
  try {
    // Ensure JSONB fields are properly serialized strings for the ::jsonb cast
    const configJson = JSON.stringify(config || {});
    const assetsJson = JSON.stringify(assets || []);
    const shotsJson  = JSON.stringify(shots  || []);

    let result;
    if (id) {
      result = await pool.query(
        `UPDATE storyboard_sessions
         SET title = $1, concept = $2, target_duration = $3, num_shots = $4,
             config = $5::jsonb, assets = $6::jsonb, shots = $7::jsonb, updated_at = NOW()
         WHERE id = $8 AND user_id = $9
         RETURNING *`,
        [title, concept, target_duration, num_shots, configJson, assetsJson, shotsJson, id, req.userId]
      );
    } else {
      result = await pool.query(
        `INSERT INTO storyboard_sessions (user_id, title, concept, target_duration, num_shots, config, assets, shots)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb) RETURNING *`,
        [req.userId, title, concept, target_duration, num_shots, configJson, assetsJson, shotsJson]
      );
    }
    res.status(id ? 200 : 201).json(result.rows[0]);
  } catch (err: any) {
    console.error('[storyboards] Save error:', {
      message: err.message,
      code:    err.code,
      detail:  err.detail,
      hint:    err.hint,
      body:    JSON.stringify(req.body).slice(0, 500),
    });
    res.status(500).json({ error: err.message, detail: err.detail, hint: err.hint });
  }
});

// DELETE /api/storyboards/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM storyboard_sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
