import { Router } from 'express';
import pool from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/service-modules
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        name AS service_module, 
        description, 
        category, 
        base_price, 
        estimated_days, 
        is_active, 
        created_at, 
        updated_at
      FROM agency_service_modules 
      ORDER BY category ASC, name ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
