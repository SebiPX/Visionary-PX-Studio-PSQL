import { Router, Response } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/profiles/internal
// Return all internal active employees (not external clients/vendors if any),
// but since the schema is shared, we'll return everyone except client roles (if role is handled)
// Looking at AuthContext, role is "admin", "employee", "freelancer", "client"
router.get('/internal', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name as name, full_name, avatar_url, role 
       FROM profiles 
       WHERE role IN ('admin', 'employee', 'freelancer')
       ORDER BY full_name ASC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/profiles
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { role } = req.query;
  try {
    let query = `SELECT id, email, full_name as name, full_name, avatar_url, role FROM profiles`;
    const params: any[] = [];
    if (role) {
      query += ` WHERE role = $1`;
      params.push(role);
    }
    query += ` ORDER BY full_name ASC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/profiles/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, avatar_url, role FROM profiles WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
