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
      `SELECT id, email, full_name as name, full_name, avatar_url, role, weekly_hours, billable_hourly_rate, internal_cost_per_hour
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
    let query = `SELECT id, email, full_name as name, full_name, avatar_url, role, weekly_hours, billable_hourly_rate, internal_cost_per_hour FROM profiles`;
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
      `SELECT id, email, full_name, avatar_url, role, weekly_hours, billable_hourly_rate, internal_cost_per_hour FROM profiles WHERE id = $1`,
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

// PUT /api/agency/profiles/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, weekly_hours, billable_hourly_rate, internal_cost_per_hour } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE profiles 
       SET role = COALESCE($1, role),
           weekly_hours = COALESCE($2, weekly_hours),
           billable_hourly_rate = COALESCE($3, billable_hourly_rate),
           internal_cost_per_hour = COALESCE($4, internal_cost_per_hour),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, full_name, avatar_url, role, weekly_hours, billable_hourly_rate, internal_cost_per_hour`,
      [role, weekly_hours, billable_hourly_rate, internal_cost_per_hour, req.params.id]
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
