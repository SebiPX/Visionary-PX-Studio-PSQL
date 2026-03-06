import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/service-pricing
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM agency_service_pricing ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/service-pricing/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM agency_service_pricing WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service pricing not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/service-pricing
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { service_module_id, seniority_level_id, rate, internal_cost } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_service_pricing (service_id, seniority_id, hourly_rate, internal_cost)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [service_module_id, seniority_level_id, rate, internal_cost || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/service-pricing/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { rate, internal_cost } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_service_pricing 
       SET hourly_rate = COALESCE($1, hourly_rate),
           internal_cost = COALESCE($2, internal_cost),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rate, internal_cost, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service pricing not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/service-pricing/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_service_pricing WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/service-pricing/batch
router.post('/batch', requireAuth, async (req: AuthRequest, res) => {
  const { pricings } = req.body;
  if (!pricings || !Array.isArray(pricings)) {
    return res.status(400).json({ error: 'pricings array is required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const p of pricings) {
        const result = await client.query(
          `INSERT INTO agency_service_pricing (service_id, seniority_id, hourly_rate, internal_cost)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [p.service_module_id, p.seniority_level_id, p.rate, p.internal_cost || 0]
        );
        results.push(result.rows[0]);
      }
      await client.query('COMMIT');
      res.status(201).json(results);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/service-pricing/batch
router.put('/batch', requireAuth, async (req: AuthRequest, res) => {
  const { updates } = req.body;
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'updates array is required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const u of updates) {
        const { id, data } = u;
        const result = await client.query(
          `UPDATE agency_service_pricing 
           SET hourly_rate = COALESCE($1, hourly_rate),
               internal_cost = COALESCE($2, internal_cost),
               updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [data.rate, data.internal_cost, id]
        );
        if (result.rows.length > 0) {
            results.push(result.rows[0]);
        }
      }
      await client.query('COMMIT');
      res.json(results);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
