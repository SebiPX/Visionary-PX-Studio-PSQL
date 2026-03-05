import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/clients
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM agency_clients ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/clients/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM agency_clients WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/clients
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { name, industry, website, logo_url, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_clients (name, industry, website, logo_url, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, industry, website, logo_url, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/clients/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { name, industry, website, logo_url, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_clients 
       SET name = COALESCE($1, name),
           industry = COALESCE($2, industry),
           website = COALESCE($3, website),
           logo_url = COALESCE($4, logo_url),
           status = COALESCE($5, status)
       WHERE id = $6
       RETURNING *`,
      [name, industry, website, logo_url, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/clients/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_clients WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
