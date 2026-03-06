import { Router } from 'express';
import pool from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/seniority-levels
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name AS level_name, 
        level, 
        multiplier, 
        created_at,
        true as is_active
      FROM agency_seniority_levels 
      ORDER BY level ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
