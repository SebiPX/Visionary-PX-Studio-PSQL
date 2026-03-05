import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/clients
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM agency_clients ORDER BY company_name ASC');
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
  const { 
    company_name, address_line1, zip_code, city, country, 
    vat_id, payment_terms_days, website, logo_url, status 
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_clients (
        company_name, address_line1, zip_code, city, country, 
        vat_id, payment_terms_days, website, logo_url, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [company_name, address_line1, zip_code, city, country, vat_id, payment_terms_days, website, logo_url, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/clients/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { 
    company_name, address_line1, zip_code, city, country, 
    vat_id, payment_terms_days, website, logo_url, status 
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_clients 
       SET company_name = COALESCE($1, company_name),
           address_line1 = COALESCE($2, address_line1),
           zip_code = COALESCE($3, zip_code),
           city = COALESCE($4, city),
           country = COALESCE($5, country),
           vat_id = COALESCE($6, vat_id),
           payment_terms_days = COALESCE($7, payment_terms_days),
           website = COALESCE($8, website),
           logo_url = COALESCE($9, logo_url),
           status = COALESCE($10, status)
       WHERE id = $11
       RETURNING *`,
      [company_name, address_line1, zip_code, city, country, vat_id, payment_terms_days, website, logo_url, status, req.params.id]
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
