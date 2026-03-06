import { Router } from 'express';
import pool from '../../db';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/reports/service-profitability
router.get('/service-profitability', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH service_cost AS (
        SELECT 
          t.service_module_id,
          COUNT(DISTINCT t.id) as tasks_count,
          SUM(te.duration_minutes / 60.0) as hours_tracked,
          SUM((te.duration_minutes / 60.0) * 0) as cost
        FROM agency_time_entries te
        JOIN agency_tasks t ON te.task_id = t.id
        JOIN profiles p ON te.user_id = p.id
        WHERE t.service_module_id IS NOT NULL 
          AND te.duration_minutes IS NOT NULL
          AND te.status IN ('submitted', 'approved', 'billed')
        GROUP BY t.service_module_id
      ),
      -- Approximation of revenue since agency_financial_items does not exist yet
      service_revenue AS (
        SELECT
          t.service_module_id,
          SUM(COALESCE(t.estimated_hours, 0) * COALESCE(t.estimated_rate, 0)) as revenue
        FROM agency_tasks t
        WHERE t.service_module_id IS NOT NULL
        GROUP BY t.service_module_id
      )
      SELECT 
        sm.id as service_module_id,
        sm.name as service_name,
        sm.category,
        COALESCE(sr.revenue, 0) as revenue,
        COALESCE(sc.cost, 0) as cost,
        COALESCE(sr.revenue, 0) - COALESCE(sc.cost, 0) as profit,
        CASE 
          WHEN COALESCE(sr.revenue, 0) > 0 THEN 
            ((COALESCE(sr.revenue, 0) - COALESCE(sc.cost, 0)) / sr.revenue) * 100
          ELSE 0 
        END as margin_percent,
        COALESCE(sc.tasks_count, 0) as tasks_count,
        COALESCE(sc.hours_tracked, 0) as hours_tracked
      FROM agency_service_modules sm
      LEFT JOIN service_revenue sr ON sm.id = sr.service_module_id
      LEFT JOIN service_cost sc ON sm.id = sc.service_module_id
      ORDER BY profit DESC, revenue DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
