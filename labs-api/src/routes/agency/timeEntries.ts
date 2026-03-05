import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/time-entries
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { project_id, user_id, start_date, end_date } = req.query;
  try {
    let query = `
      SELECT te.*, 
        json_build_object('id', t.id, 'title', t.title) as task,
        json_build_object('id', p.id, 'title', p.title) as project,
        json_build_object('id', u.id, 'full_name', u.full_name) as user
      FROM agency_time_entries te
      JOIN agency_tasks t ON te.task_id = t.id
      JOIN agency_projects p ON t.project_id = p.id
      JOIN profiles u ON te.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    if (project_id) {
      query += ` AND t.project_id = $${paramIdx++}`;
      params.push(project_id);
    }
    if (user_id) {
      query += ` AND te.user_id = $${paramIdx++}`;
      params.push(user_id);
    }
    if (start_date) {
      query += ` AND te.date >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND te.date <= $${paramIdx++}`;
      params.push(end_date);
    }

    query += ` ORDER BY te.date DESC, te.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/time-entries
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { task_id, user_id, date, hours, description, billable, status } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_time_entries (task_id, user_id, date, hours, description, billable, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [task_id, user_id || req.userId, date, hours, description, billable ?? true, status ?? 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/time-entries/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { hours, description, billable, status, date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_time_entries 
       SET hours = COALESCE($1, hours),
           description = COALESCE($2, description),
           billable = COALESCE($3, billable),
           status = COALESCE($4, status),
           date = COALESCE($5, date),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [hours, description, billable, status, date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/time-entries/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_time_entries WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
