import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/time-entries/submitted
router.get('/submitted', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT te.*, 
        te.user_id as profile_id,
        json_build_object('id', t.id, 'title', t.title) as task,
        json_build_object('id', p.id, 'title', p.title) as project,
        json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url) as profile
      FROM agency_time_entries te
      JOIN agency_tasks t ON te.task_id = t.id
      JOIN agency_projects p ON t.project_id = p.id
      LEFT JOIN profiles u ON te.user_id = u.id
      WHERE te.status = 'submitted'
      ORDER BY te.start_time DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/time-entries/stats
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        COALESCE(SUM(duration_minutes)/60.0, 0) as total_hours,
        COUNT(*) FILTER (WHERE status = 'submitted') as pending_approvals
      FROM agency_time_entries
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/time-entries/approve-batch
router.post('/approve-batch', requireAuth, async (req: AuthRequest, res) => {
  const { ids } = req.body;
  try {
    await pool.query(
      `UPDATE agency_time_entries SET status = 'approved', updated_at = NOW() WHERE id = ANY($1)`,
      [ids]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/time-entries/:id/reject
router.post('/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_time_entries 
       SET status = 'rejected', rejection_reason = $1, updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [reason, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/time-entries
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { project_id, user_id, start_date, end_date } = req.query;
  try {
    let query = `
      SELECT te.*, 
        te.user_id as profile_id,
        json_build_object('id', t.id, 'title', t.title) as task,
        json_build_object('id', p.id, 'title', p.title) as project,
        json_build_object('id', u.id, 'full_name', u.full_name) as profile
      FROM agency_time_entries te
      JOIN agency_tasks t ON te.task_id = t.id
      JOIN agency_projects p ON t.project_id = p.id
      LEFT JOIN profiles u ON te.user_id = u.id
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
      query += ` AND te.start_time >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND te.start_time <= $${paramIdx++}`;
      params.push(end_date);
    }

    query += ` ORDER BY te.start_time DESC, te.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/time-entries
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { task_id, user_id, profile_id, start_time, end_time, duration_minutes, description, billable, status } = req.body;
  const actualUserId = profile_id || user_id || req.userId;
  try {
    const result = await pool.query(
      `INSERT INTO agency_time_entries (task_id, user_id, start_time, end_time, duration_minutes, description, billable, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *, user_id as profile_id`,
      [task_id, actualUserId, start_time, end_time, duration_minutes, description, billable ?? true, status ?? 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/time-entries/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { start_time, end_time, duration_minutes, description, billable, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_time_entries 
       SET start_time = COALESCE($1, start_time),
           end_time = COALESCE($2, end_time),
           duration_minutes = COALESCE($3, duration_minutes),
           description = COALESCE($4, description),
           billable = COALESCE($5, billable),
           status = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *, user_id as profile_id`,
      [start_time, end_time, duration_minutes, description, billable, status, req.params.id]
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
