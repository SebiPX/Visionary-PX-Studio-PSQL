import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/resources/availability
router.get('/availability', requireAuth, async (req: AuthRequest, res) => {
  const { start, end } = req.query;
  
  try {
    // 1. Fetch all users who have active tasks in this date range or are part of projects
    // For now, let's just fetch all profiles that have tasks.
    const usersResult = await pool.query(`
      SELECT DISTINCT p.id, p.full_name, p.avatar_url, p.email
      FROM profiles p
      JOIN agency_tasks t ON t.assignee_id = p.id
      WHERE t.status != 'completed'
    `);

    const users = usersResult.rows;

    // 2. Fetch tasks for these users
    const tasksResult = await pool.query(`
      SELECT 
        t.id, t.title, t.estimated_hours, t.status, t.due_date, t.start_date, t.assignee_id,
        p.title as project_title, p.color as project_color
      FROM agency_tasks t
      JOIN agency_projects p ON t.project_id = p.id
      WHERE t.status != 'completed' AND t.assignee_id IS NOT NULL
    `);

    const tasks = tasksResult.rows;

    const resourceData = users.map(user => {
      const userTasks = tasks.filter(t => t.assignee_id === user.id);
      
      // Group tasks by due_date to simulate allocation
      const allocations: Record<string, any> = {};
      
      userTasks.forEach(t => {
        // If task has no due date, put it on today
        let dateKey = new Date().toISOString().split('T')[0];
        if (t.due_date) {
            const d = new Date(t.due_date);
            if (!isNaN(d.getTime())) {
                dateKey = d.toISOString().split('T')[0];
            }
        }

        if (!allocations[dateKey]) {
          allocations[dateKey] = {
            date: dateKey,
            hours: 0,
            tasks: []
          };
        }
        
        const hours = parseFloat(t.estimated_hours) || 0;
        allocations[dateKey].hours += hours;
        allocations[dateKey].tasks.push({
          id: t.id,
          title: t.title,
          projectTitle: t.project_title || 'Unknown Project',
          projectColor: t.project_color || '#cccccc',
          hours: hours,
          status: t.status
        });
      });

      return {
        profile: user,
        allocations,
        capacityPerDay: 8
      };
    });

    res.json(resourceData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
