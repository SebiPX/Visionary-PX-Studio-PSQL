import { Router } from 'express';
import pool from '../../db';
import { AuthRequest, requireAuth } from '../../middleware/requireAuth';

const router = Router();

// GET /api/agency/resources/availability
router.get('/availability', requireAuth, async (req: AuthRequest, res) => {
  const { start, end } = req.query;
  
  try {
    // 1. Fetch all users who have active tasks in this date range or are part of projects
    const usersResult = await pool.query(`
      SELECT DISTINCT p.id, p.full_name, p.avatar_url, p.email, p.moco_user_id
      FROM profiles p
      JOIN agency_tasks t ON t.assignee_id = p.id
      WHERE t.status != 'completed'
    `);

    const users = usersResult.rows;

    // 2. Fetch tasks for these users
    const tasksResult = await pool.query(`
      SELECT 
        t.id, t.title, t.estimated_hours, t.status, t.due_date, t.start_date, t.assignee_id,
        p.title as project_title, p.color_code as project_color
      FROM agency_tasks t
      JOIN agency_projects p ON t.project_id = p.id
      WHERE t.status != 'completed' AND t.assignee_id IS NOT NULL
    `);

    const tasks = tasksResult.rows;

    // 3. Fetch MOCO Absences for these users
    const absencesResult = await pool.query(`
      SELECT a.date, a.reason, p.id as user_id 
      FROM agency_moco_absences a
      JOIN profiles p ON a.moco_user_id = p.moco_user_id
    `);
    const absences = absencesResult.rows;

    const resourceData = users.map(user => {
      const userTasks = tasks.filter(t => t.assignee_id === user.id);
      const userAbsences = absences.filter(a => a.user_id === user.id);
      
      const allocations: Record<string, any> = {};
      
      userTasks.forEach(t => {
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
            tasks: [],
            absences: []
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

      userAbsences.forEach(a => {
         const dateKey = new Date(a.date).toISOString().split('T')[0];
         if (!allocations[dateKey]) {
           allocations[dateKey] = {
             date: dateKey,
             hours: 0,
             tasks: [],
             absences: []
           };
         }
         if (!allocations[dateKey].absences) allocations[dateKey].absences = [];
         allocations[dateKey].absences.push({ reason: a.reason || 'Abwesend' });
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
