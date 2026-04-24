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
    materials, custom_dates, depends_on_task_ids,
    service_module_id, project_service_id, seniority_level_id, is_visible_to_client,
    brand, show, formats, legal_line, freigabelink, rights_expiration_date, status_influencerclips
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
      materials ? materials : [],
      custom_dates ? JSON.stringify(custom_dates) : '[]',
      depends_on_task_ids ? depends_on_task_ids : [],
      service_module_id ?? null,
      project_service_id ?? null,
      seniority_level_id ?? null,
      is_visible_to_client ?? null,
      brand ?? null,
      show ?? null,
      formats ? formats : [],
      legal_line ?? null,
      freigabelink ?? null,
      rights_expiration_date ?? null,
      status_influencerclips ?? false,
      req.userId // created_by
    ];

    const result = await pool.query(
      `INSERT INTO agency_tasks (
        project_id, title, description, status, priority, 
        assignee_id, assignee_ids, start_date, review_date, revision_date, due_date, planned_minutes,
        estimated_hours, estimated_rate, materials, custom_dates, depends_on_task_ids,
        service_module_id, project_service_id, seniority_level_id, is_visible_to_client,
        brand, show, formats, legal_line, freigabelink, rights_expiration_date, status_influencerclips,
        created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
       RETURNING *`,
      args
    );
    
    const newTask = result.rows[0];
    
    if (actualAssigneeIds.length > 0) {
      import('../../services/notificationService').then(({ notifyTaskAssignees }) => {
        notifyTaskAssignees(
          actualAssigneeIds,
          {
            type: 'info',
            title: `Neuer Task zugewiesen`,
            message: `Dir wurde der Task "${newTask.title}" zugewiesen.`,
            related_entity_id: newTask.project_id,
            related_entity_type: 'task'
          },
          req.userId
        );
      }).catch(err => console.error('Error importing notificationService:', err));
    }

    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/tasks/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const existingResult = await pool.query('SELECT * FROM agency_tasks WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const existingTask = existingResult.rows[0];

    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.userId]);
    const userRole = userResult.rows[0]?.role || 'user';
    const isCreator = existingTask.created_by === req.userId;
    const canEdit = userRole === 'admin' || userRole === 'pjm' || isCreator;

    const updates = req.body;
    const allowedFields = [
      'title', 'description', 'status', 'priority', 
      'assignee_ids', 'start_date', 'review_date', 'revision_date', 'due_date', 
      'planned_minutes', 'estimated_hours', 'estimated_rate', 
      'materials', 'custom_dates', 'depends_on_task_ids',
      'service_module_id', 'project_service_id', 'seniority_level_id', 'is_visible_to_client',
      'brand', 'show', 'formats', 'legal_line', 'freigabelink', 'rights_expiration_date', 'status_influencerclips'
    ];

    if (!canEdit) {
      const restrictedFields = allowedFields.filter(f => f !== 'status');
      const hasRestrictedUpdates = restrictedFields.some(f => updates[f] !== undefined);
      if (hasRestrictedUpdates) {
        return res.status(403).json({ error: 'You do not have permission to edit this task.' });
      }
    }

    const setClauses: string[] = [];
    const args: any[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'custom_dates' && typeof updates[field] === 'object') {
          setClauses.push(`${field} = $${paramIdx++}`);
          args.push(JSON.stringify(updates[field]));
        } else {
          setClauses.push(`${field} = $${paramIdx++}`);
          args.push(updates[field]);
        }
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
      return res.json(existingTask);
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
    
    const updatedTask = result.rows[0];

    if (updates.status && updates.status !== existingTask.status) {
      import('../../services/notificationService').then(({ notifyProjectMembers }) => {
        notifyProjectMembers(
          updatedTask.project_id,
          {
            type: 'info',
            title: `Task-Status geändert`,
            message: `Der Status von "${updatedTask.title}" wurde auf "${updatedTask.status}" geändert.`,
            related_entity_id: updatedTask.project_id,
            related_entity_type: 'task'
          },
          req.userId
        );
      }).catch(err => console.error('Error importing notificationService:', err));
    }

    res.json(updatedTask);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/tasks/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const existingResult = await pool.query('SELECT * FROM agency_tasks WHERE id = $1', [req.params.id]);
    if (existingResult.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const existingTask = existingResult.rows[0];

    const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [req.userId]);
    const userRole = userResult.rows[0]?.role || 'user';
    const isCreator = existingTask.created_by === req.userId;
    const canDelete = userRole === 'admin' || userRole === 'pjm' || isCreator;

    if (!canDelete) {
      return res.status(403).json({ error: 'You do not have permission to delete this task.' });
    }

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
