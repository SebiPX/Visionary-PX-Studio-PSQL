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

// POST /api/agency/projects/margins-batch
router.post('/margins-batch', requireAuth, async (req: AuthRequest, res) => {
  const { projectIds } = req.body;
  
  if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
    return res.json({});
  }

  try {
    // Basic implementation to return some valid records
    // In a real app, query the costs and revenues for the provided projectIds
    const result = await pool.query(`
      SELECT 
        p.id as project_id,
        COALESCE((SELECT SUM(amount) FROM agency_costs WHERE project_id = p.id), 0) as costs,
        COALESCE((SELECT SUM(hours) FROM agency_time_entries te JOIN agency_tasks t ON te.task_id = t.id WHERE t.project_id = p.id AND te.billable = true), 0) * COALESCE(p.hourly_rate, 0) as billable_value
      FROM agency_projects p
      WHERE p.id = ANY($1)
    `, [projectIds]);
    
    const margins: Record<string, any> = {};
    for (const row of result.rows) {
      const revenue = Number(row.billable_value) || 0;
      const costs = Number(row.costs) || 0;
      const profit = revenue - costs;
      let marginPercentage = 0;
      if (revenue > 0) {
        marginPercentage = (profit / revenue) * 100;
      }
      
      let status = 'acceptable';
      if (marginPercentage < 0) status = 'negative';
      else if (marginPercentage < 15) status = 'poor';
      else if (marginPercentage >= 40) status = 'excellent';
      else if (marginPercentage >= 25) status = 'good';
      
      margins[row.project_id] = { profit, marginPercentage, status };
    }
    
    res.json(margins);
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

// GET /api/agency/projects/:id/members
router.get('/:id/members', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT pm.*,
        json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url, 'email', p.email) as profile
       FROM agency_project_members pm
       JOIN profiles p ON pm.user_id = p.id
       WHERE pm.project_id = $1`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:id/tasks
router.get('/:id/tasks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`SELECT * FROM agency_tasks WHERE project_id = $1 ORDER BY created_at DESC`, [req.params.id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:id/costs
router.get('/:id/costs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`SELECT * FROM agency_costs WHERE project_id = $1 ORDER BY date DESC`, [req.params.id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:id/financial-documents
router.get('/:id/financial-documents', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`SELECT * FROM agency_financial_documents WHERE project_id = $1 ORDER BY created_at DESC`, [req.params.id]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:id/time-entries
router.get('/:id/time-entries', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT te.*,
        json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as profile
      FROM agency_time_entries te
      JOIN agency_tasks t ON te.task_id = t.id
      JOIN profiles p ON te.user_id = p.id
      WHERE t.project_id = $1 
      ORDER BY te.date DESC
    `, [req.params.id]);
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

// GET /api/agency/projects/:projectId/revenue
router.get('/:projectId/revenue', requireAuth, async (req: AuthRequest, res) => {
  try {
    // For now, return sum of billable hours as revenue, or total quotes.
    const result = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as revenue FROM agency_financial_documents WHERE project_id = $1 AND type = 'quote' AND status = 'approved'`,
      [req.params.projectId]
    );
    res.json({ revenue: Number(result.rows[0].revenue) || 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:projectId/costs/calculate
router.get('/:projectId/costs/calculate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    // Get direct costs
    const costsRes = await pool.query(`SELECT COALESCE(SUM(amount), 0) as costs FROM agency_costs WHERE project_id = $1`, [projectId]);
    const directCosts = Number(costsRes.rows[0].costs);
    
    // Get billable hours value
    const timeRes = await pool.query(`
      SELECT COALESCE(SUM(te.hours), 0) as total_hours, p.hourly_rate 
      FROM agency_time_entries te 
      JOIN agency_tasks t ON te.task_id = t.id 
      JOIN agency_projects p ON t.project_id = p.id
      WHERE t.project_id = $1 AND te.billable = true
      GROUP BY p.hourly_rate
    `, [projectId]);
    
    const billableHoursValue = timeRes.rows.length ? Number(timeRes.rows[0].total_hours) * Number(timeRes.rows[0].hourly_rate) : 0;
    
    res.json({
      directCosts,
      billableHoursValue,
      totalCosts: directCosts + billableHoursValue
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/projects/:projectId/margin
router.get('/:projectId/margin', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Dummy / simplified for now
    res.json({
      revenue: 0,
      costs: { directCosts: 0, billableHoursValue: 0, totalCosts: 0 },
      profit: 0,
      marginPercentage: 0,
      status: 'acceptable'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/projects/:projectId/budget/sync
router.post('/:projectId/budget/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
