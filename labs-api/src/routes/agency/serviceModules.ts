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

// GET /api/service-modules/pricing
router.get('/pricing', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        sm.id, 
        sm.name AS service_module, 
        sm.description, 
        sm.category, 
        sm.base_price, 
        sm.estimated_days, 
        sm.is_active, 
        sm.created_at, 
        sm.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sp.id,
              'service_module_id', sp.service_id,
              'seniority_level_id', sp.seniority_id,
              'rate', sp.hourly_rate,
              'internal_cost', sp.internal_cost,
              'created_at', sp.created_at,
              'seniority_level', json_build_object(
                'id', sl.id,
                'level_name', sl.name,
                'level_order', sl.level,
                'multiplier', sl.multiplier
              )
            )
          ) FILTER (WHERE sp.id IS NOT NULL), 
          '[]'
        ) as pricing
      FROM agency_service_modules sm
      LEFT JOIN agency_service_pricing sp ON sm.id = sp.service_id
      LEFT JOIN agency_seniority_levels sl ON sp.seniority_id = sl.id
      GROUP BY sm.id
      ORDER BY sm.category ASC, sm.name ASC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service-modules
router.post('/', requireAuth, async (req, res) => {
  const { category, service_module, description, default_unit, is_active } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_service_modules (category, name, description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name AS service_module, description, category, base_price, estimated_days, is_active, created_at, updated_at`,
      [category, service_module, description, is_active ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/service-modules/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { category, service_module, description, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_service_modules 
       SET category = COALESCE($1, category),
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name AS service_module, description, category, base_price, estimated_days, is_active, created_at, updated_at`,
      [category, service_module, description, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service module not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/service-modules/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM agency_service_modules WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
