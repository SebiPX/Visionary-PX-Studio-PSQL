import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/inventar/loans?item_id=...
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { item_id } = req.query;
    const params: string[] = [];
    let where = '';
    if (item_id) {
      params.push(item_id as string);
      where = `WHERE l.item_id = $1`;
    }
    const result = await pool.query(
      `SELECT
         l.*,
         json_build_object(
           'id', p.id, 'full_name', p.full_name, 'email', p.email,
           'avatar_url', p.avatar_url, 'role', p.role
         ) AS profile,
         json_build_object(
           'id', i.id, 'geraet', i.geraet, 'modell', i.modell,
           'px_nummer', i.px_nummer, 'bild_url', i.bild_url
         ) AS item
       FROM inventar_loans l
       LEFT JOIN profiles  p ON p.id = l.profile_id
       LEFT JOIN inventar_items i ON i.id = l.item_id
       ${where}
       ORDER BY l.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventar/loans
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { item_id, profile_id, mitarbeiter_name, department,
          ausgeliehen_am, zurueck_bis, zweck, notes, created_by } = req.body;
  try {
    const ins = await pool.query(
      `INSERT INTO inventar_loans
         (item_id, profile_id, mitarbeiter_name, department, ausgeliehen_am,
          zurueck_bis, zweck, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [item_id, profile_id, mitarbeiter_name, department,
       ausgeliehen_am, zurueck_bis, zweck, notes, created_by]
    );
    const loan = ins.rows[0];
    // Fetch with join  
    const result = await pool.query(
      `SELECT l.*,
         json_build_object('id', p.id, 'full_name', p.full_name,
           'email', p.email, 'avatar_url', p.avatar_url, 'role', p.role) AS profile
       FROM inventar_loans l
       LEFT JOIN profiles p ON p.id = l.profile_id
       WHERE l.id = $1`,
      [loan.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/inventar/loans/:id/return — mark returned today
router.patch('/:id/return', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const upd = await pool.query(
      `UPDATE inventar_loans SET zurueck_am = $1 WHERE id = $2 RETURNING id`,
      [today, req.params.id]
    );
    if (upd.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    const result = await pool.query(
      `SELECT l.*,
         json_build_object('id', p.id, 'full_name', p.full_name,
           'email', p.email, 'avatar_url', p.avatar_url, 'role', p.role) AS profile
       FROM inventar_loans l
       LEFT JOIN profiles p ON p.id = l.profile_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inventar/loans/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM inventar_loans WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
