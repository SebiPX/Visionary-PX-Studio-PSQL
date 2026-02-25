import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/inventar/dashboard-config — get config for the authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT config FROM inventar_dashboard_config WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows[0]?.config || null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventar/dashboard-config — upsert config for the authenticated user
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const config = req.body;
  try {
    await pool.query(
      `INSERT INTO inventar_dashboard_config (user_id, config)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE
         SET config = $2, updated_at = NOW()`,
      [req.userId, JSON.stringify(config)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
