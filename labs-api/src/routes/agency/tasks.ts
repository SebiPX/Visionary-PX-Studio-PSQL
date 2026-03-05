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
  const { project_id, title, description, status, priority, assignee_id, estimated_hours, due_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_tasks (project_id, title, description, status, priority, assignee_id, estimated_hours, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [project_id, title, description, status, priority, assignee_id, estimated_hours, due_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/tasks/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, status, priority, assignee_id, estimated_hours, due_date } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assignee_id = $5, -- Allow nullifying assignee
           estimated_hours = COALESCE($6, estimated_hours),
           due_date = COALESCE($7, due_date),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [title, description, status, priority, assignee_id, estimated_hours, due_date, req.params.id]
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

export default router;
