import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/tasks
// Optionally filter by project_id
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { project_id } = req.query;
  try {
    let query = `
      SELECT t.*, 
        json_build_object('id', p.id, 'title', p.title) as project,
        json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url) as assignee
      FROM agency_tasks t
      JOIN agency_projects p ON t.project_id = p.id
      LEFT JOIN profiles u ON t.assignee_id = u.id
    `;
    const params: any[] = [];
    
    if (project_id) {
      query += ` WHERE t.project_id = $1`;
      params.push(project_id);
    }
    
    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/tasks/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
        json_build_object('id', p.id, 'title', p.title) as project,
        json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url) as assignee
      FROM agency_tasks t
      JOIN agency_projects p ON t.project_id = p.id
      LEFT JOIN profiles u ON t.assignee_id = u.id
      WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/tasks
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { 
    project_id, title, description, status, priority, 
    assignee_id, assigned_to,
    start_date, due_date, planned_minutes,
    estimated_hours, estimated_rate,
    service_module_id, seniority_level_id, is_visible_to_client
  } = req.body;
  const actualAssignee = assignee_id !== undefined ? assignee_id : (assigned_to !== undefined ? assigned_to : null);

  try {
    const args = [
      project_id ?? null,
      title ?? null,
      description ?? null,
      status ?? null,
      priority ?? null,
      actualAssignee ?? null,
      start_date ?? null,
      due_date ?? null,
      planned_minutes ?? null,
      estimated_hours ?? null,
      estimated_rate ?? null,
      service_module_id ?? null,
      seniority_level_id ?? null,
      is_visible_to_client ?? null
    ];

    const result = await pool.query(
      `INSERT INTO agency_tasks (
        project_id, title, description, status, priority, 
        assignee_id, start_date, due_date, planned_minutes,
        estimated_hours, estimated_rate,
        service_module_id, seniority_level_id, is_visible_to_client
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      args
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/tasks/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { 
    title, description, status, priority, 
    assignee_id, assigned_to,
    start_date, due_date, planned_minutes,
    estimated_hours, estimated_rate,
    service_module_id, seniority_level_id, is_visible_to_client
  } = req.body;
  const actualAssignee = assignee_id !== undefined ? assignee_id : (assigned_to !== undefined ? assigned_to : null);

  try {
    const args = [
      title ?? null,
      description ?? null,
      status ?? null,
      priority ?? null,
      actualAssignee ?? null,
      start_date ?? null,
      due_date ?? null,
      planned_minutes ?? null,
      estimated_hours ?? null,
      estimated_rate ?? null,
      service_module_id ?? null,
      seniority_level_id ?? null,
      is_visible_to_client ?? null,
      req.params.id
    ];

    const result = await pool.query(
      `UPDATE agency_tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assignee_id = $5, -- Allow nullifying assignee
           start_date = COALESCE($6, start_date),
           due_date = COALESCE($7, due_date),
           planned_minutes = COALESCE($8, planned_minutes),
           estimated_hours = COALESCE($9, estimated_hours),
           estimated_rate = COALESCE($10, estimated_rate),
           service_module_id = $11,
           seniority_level_id = $12,
           is_visible_to_client = COALESCE($13, is_visible_to_client),
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      args
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/tasks/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_tasks WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/tasks/:id/time-entries
router.get('/:id/time-entries', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT te.*,
        te.user_id as profile_id,
        json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'email', p.email) as profile
       FROM agency_time_entries te
       LEFT JOIN profiles p ON te.user_id = p.id
       WHERE te.task_id = $1
       ORDER BY te.start_time DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
