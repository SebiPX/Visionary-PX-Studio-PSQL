import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/inventar/items
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM inventar_items ORDER BY geraet ASC, px_nummer ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventar/items
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const {
    geraet, px_nummer, aufkleber, modell, seriennummer, ort, os, status,
    ip_office, ip_tiger, px_eigentum, handy_nr, notes, department,
    is_verleihartikel, anschaffungsdatum, anschaffungspreis, bild_url,
    assigned_to_name, assigned_to_id,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO inventar_items
        (geraet, px_nummer, aufkleber, modell, seriennummer, ort, os, status,
         ip_office, ip_tiger, px_eigentum, handy_nr, notes, department,
         is_verleihartikel, anschaffungsdatum, anschaffungspreis, bild_url,
         assigned_to_name, assigned_to_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [geraet, px_nummer, aufkleber, modell, seriennummer, ort, os, status,
       ip_office, ip_tiger, px_eigentum, handy_nr, notes, department,
       is_verleihartikel, anschaffungsdatum, anschaffungspreis, bild_url,
       assigned_to_name, assigned_to_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/inventar/items/:id
router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const fields = req.body;
  const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at');
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = keys.map(k => fields[k]);
  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE inventar_items SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inventar/items/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM inventar_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
