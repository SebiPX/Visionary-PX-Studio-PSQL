import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/projects
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        json_build_object('id', c.id, 'company_name', c.company_name, 'logo_url', c.logo_url) as client
       FROM agency_projects p
       LEFT JOIN agency_clients c ON p.client_id = c.id
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/financial-overview
router.get('/financial-overview', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id as project_id,
        COALESCE((SELECT SUM(amount) FROM agency_costs WHERE project_id = p.id), 0) as costs,
        COALESCE((SELECT SUM(hours) FROM agency_time_entries te JOIN agency_tasks t ON te.task_id = t.id WHERE t.project_id = p.id AND te.billable = true), 0) * p.hourly_rate as billableValue
      FROM agency_projects p
    `);
    
    // Transform array to Record<string, { costs, billableValue, total }>
    const overview: Record<string, any> = {};
    for (const row of result.rows) {
      const costs = Number(row.costs);
      const billable = Number(row.billablevalue) || 0; // alias is returned mostly lowercase
      overview[row.project_id] = {
        costs: costs,
        billableValue: billable,
        total: billable - costs
      };
    }
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/stats
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM agency_projects
    `);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        json_build_object('id', c.id, 'company_name', c.company_name, 'logo_url', c.logo_url) as client
       FROM agency_projects p
       LEFT JOIN agency_clients c ON p.client_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:id/assets
router.get('/:id/assets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
        json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as uploader
       FROM agency_assets a
       LEFT JOIN profiles p ON a.uploaded_by = p.id
       WHERE a.project_id = $1
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/projects
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { title, client_id, description, category, color_code, main_contact_id, status, start_date, deadline, budget_total, hourly_rate } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO agency_projects (title, client_id, description, category, color_code, main_contact_id, status, start_date, deadline, budget_total, hourly_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [title, client_id, description, category, color_code, main_contact_id, status, start_date, deadline, budget_total, hourly_rate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agency/projects/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { title, client_id, description, category, color_code, main_contact_id, status, start_date, deadline, budget_total, hourly_rate } = req.body;
  try {
    const result = await pool.query(
      `UPDATE agency_projects 
       SET title = COALESCE($1, title),
           client_id = COALESCE($2, client_id),
           description = COALESCE($3, description),
           category = COALESCE($4, category),
           color_code = COALESCE($5, color_code),
           main_contact_id = COALESCE($6, main_contact_id),
           status = COALESCE($7, status),
           start_date = COALESCE($8, start_date),
           deadline = COALESCE($9, deadline),
           budget_total = COALESCE($10, budget_total),
           hourly_rate = COALESCE($11, hourly_rate),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [title, client_id, description, category, color_code, main_contact_id, status, start_date, deadline, budget_total, hourly_rate, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agency/projects/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await pool.query('DELETE FROM agency_projects WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
