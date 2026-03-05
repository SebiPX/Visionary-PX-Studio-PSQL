import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// Helper to calculate workload for a user
async function getUserWorkloadData(userId: string) {
  // Query total assigned tasks and hours
  const tasksResult = await pool.query(
    `SELECT COUNT(*) as assigned_tasks, COALESCE(SUM(estimated_hours), 0) as total_planned_hours
     FROM agency_tasks
     WHERE assignee_id = $1 AND status != 'completed'`,
    [userId]
  );
  
  // Query total assigned projects
  const projectsResult = await pool.query(
    `SELECT COUNT(DISTINCT project_id) as assigned_projects
     FROM agency_project_members
     WHERE user_id = $1`,
    [userId]
  );

  // Get user profile
  const profileResult = await pool.query(
    `SELECT id, full_name, avatar_url, email
     FROM profiles
     WHERE id = $1`,
    [userId]
  );

  const totalPlannedHours = parseFloat(tasksResult.rows[0].total_planned_hours) || 0;
  const weeklyCapacityHours = 40; // Default capacity

  return {
    profile_id: userId,
    profile: profileResult.rows[0],
    total_planned_minutes: totalPlannedHours * 60,
    total_planned_hours: totalPlannedHours,
    weekly_capacity_hours: weeklyCapacityHours,
    utilization_percentage: (totalPlannedHours / weeklyCapacityHours) * 100,
    assigned_projects: parseInt(projectsResult.rows[0].assigned_projects, 10) || 0,
    assigned_tasks: parseInt(tasksResult.rows[0].assigned_tasks, 10) || 0,
  };
}

// GET /api/agency/workload/users/:id
router.get('/users/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = await getUserWorkloadData(req.params.id);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agency/workload/users/batch
router.post('/users/batch', requireAuth, async (req: AuthRequest, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) {
    return res.status(400).json({ error: 'userIds array is required' });
  }
  
  try {
    const results: Record<string, any> = {};
    for (const id of userIds) {
      results[id] = await getUserWorkloadData(id);
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agency/workload/projects/:id
router.get('/projects/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Basic calculation for project workload
    const result = await pool.query(
      `SELECT COALESCE(SUM(estimated_hours), 0) as total_planned_hours
       FROM agency_tasks
       WHERE project_id = $1 AND status != 'completed'`,
      [req.params.id]
    );
    
    const totalPlannedHours = parseFloat(result.rows[0].total_planned_hours) || 0;
    
    res.json({
      total_planned_minutes: totalPlannedHours * 60,
      total_planned_hours: totalPlannedHours,
      project_duration_weeks: 4, // Estimate
      weekly_effort_required: totalPlannedHours / 4
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
