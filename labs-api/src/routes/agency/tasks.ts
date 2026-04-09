import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/tasks
// Optionally filter by project_id
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const { project_id, assignee_id } = req.query;
  try {
    let query = `
      SELECT t.*, 
        json_build_object('id', p.id, 'title', p.title) as project,
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url))
            FROM profiles u
            WHERE u.id = ANY(t.assignee_ids)
          ), 
          '[]'::json
        ) as assignees
      FROM agency_tasks t
      JOIN agency_projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (project_id) {
      params.push(project_id);
      query += ` AND t.project_id = $${params.length}`;
    }

    if (assignee_id) {
      params.push(assignee_id);
      query += ` AND $${params.length} = ANY(t.assignee_ids)`;
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
        COALESCE(
          (
            SELECT json_agg(json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url))
            FROM profiles u
            WHERE u.id = ANY(t.assignee_ids)
          ), 
          '[]'::json
        ) as assignees
      FROM agency_tasks t
      JOIN agency_projects p ON t.project_id = p.id
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
    assignee_ids, assigned_to,
    start_date, review_date, revision_date, due_date, planned_minutes,
    estimated_hours, estimated_rate,
    service_module_id, seniority_level_id, is_visible_to_client
  } = req.body;
  const actualAssigneeIds = Array.isArray(assignee_ids) ? assignee_ids : (assigned_to ? [assigned_to] : []);
  const primaryAssignee = actualAssigneeIds.length > 0 ? actualAssigneeIds[0] : null;

  try {
    const args = [
      project_id ?? null,
      title ?? null,
      description ?? null,
      status ?? null,
      priority ?? null,
      primaryAssignee,
      actualAssigneeIds,
      start_date ?? null,
      review_date ?? null,
      revision_date ?? null,
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
        assignee_id, assignee_ids, start_date, review_date, revision_date, due_date, planned_minutes,
        estimated_hours, estimated_rate,
        service_module_id, seniority_level_id, is_visible_to_client
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
  try {
    const updates = req.body;
    const allowedFields = [
      'title', 'description', 'status', 'priority', 
      'assignee_ids', 'start_date', 'review_date', 'revision_date', 'due_date', 
      'planned_minutes', 'estimated_hours', 'estimated_rate', 
      'service_module_id', 'seniority_level_id', 'is_visible_to_client'
    ];

    const setClauses: string[] = [];
    const args: any[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx}`);
        args.push(updates[field]);
        paramIdx++;
      }
    }
    
    // Add support for legacy assigned_to array format
    if (updates.assigned_to !== undefined && updates.assignee_ids === undefined) {
      setClauses.push(`assignee_ids = $${paramIdx}`);
      args.push(Array.isArray(updates.assigned_to) ? updates.assigned_to : [updates.assigned_to]);
      paramIdx++;
    }

    // Keep assignee_id updated for legacy single-assignee integrations 
    if (updates.assignee_ids !== undefined) {
      setClauses.push(`assignee_id = $${paramIdx}`);
      args.push(updates.assignee_ids.length > 0 ? updates.assignee_ids[0] : null);
      paramIdx++;
    }

    if (setClauses.length === 0) {
      // If nothing is provided, just return the task
      const existing = await pool.query('SELECT * FROM agency_tasks WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
      return res.json(existing.rows[0]);
    }

    setClauses.push('updated_at = NOW()');
    args.push(req.params.id);

    const query = `
      UPDATE agency_tasks 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIdx}
      RETURNING *
    `;

    const result = await pool.query(query, args);

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
