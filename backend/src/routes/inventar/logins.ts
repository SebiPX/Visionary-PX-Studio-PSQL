import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`SELECT * FROM logins ORDER BY name ASC`);
    res.json(result.rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, website, login_name, passwort, anmerkung, kategorie, department } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO logins (name, website, login_name, passwort, anmerkung, kategorie, department)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, website, login_name, passwort, anmerkung, kategorie, department]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const fields = req.body;
  const keys = Object.keys(fields).filter(k => k !== 'id' && k !== 'created_at');
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });
  const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...keys.map(k => fields[k]), id];
  try {
    const result = await pool.query(
      `UPDATE logins SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM logins WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
