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
      SELECT id, full_name, avatar_url, email, moco_user_id
      FROM profiles
      WHERE role IN ('admin', 'pjm', 'creative', 'employee') OR role IS NULL
      ORDER BY full_name ASC
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

// POST /api/agency/resources/sync-moco-data
router.post('/sync-moco-data', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { syncUsers, syncSchedules } = await import('../../services/mocoService');
    
    // 1. Sync & Map Users
    const mocoUsers = await syncUsers();
    let usersMapped = 0;
    
    if (Array.isArray(mocoUsers)) {
      for (const mu of mocoUsers) {
        if (mu.email) {
          // Update profile with matching email
          const updateRes = await pool.query(
            `UPDATE profiles SET moco_user_id = $1 WHERE email = $2 RETURNING id`,
            [mu.id, mu.email]
          );
          if (updateRes.rows.length > 0) usersMapped++;
        }
      }
    }

    // 2. Sync Absences from Schedules
    const mocoSchedules = await syncSchedules();
    let absencesImported = 0;

    if (Array.isArray(mocoSchedules)) {
      for (const entry of mocoSchedules) {
        // We only care about absences (Urlaub, Krankheit, Feiertage)
        if (entry.assignment && entry.assignment.type === 'Absence' && entry.user?.id) {
          
          const reason = entry.assignment.name || 'Abwesenheit';
          const date = entry.date;
          const am = entry.am ?? true;
          const pm = entry.pm ?? true;
          const mocoUserId = entry.user.id;
          const scheduleId = entry.id;

          await pool.query(`
            INSERT INTO agency_moco_absences (moco_absence_id, moco_user_id, date, am, pm, reason)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (moco_absence_id) 
            DO UPDATE SET date = EXCLUDED.date, am = EXCLUDED.am, pm = EXCLUDED.pm, reason = EXCLUDED.reason
          `, [scheduleId, mocoUserId, date, am, pm, reason]);
          
          absencesImported++;
        }
      }
    }

    res.json({ success: true, usersMapped, absencesImported });
  } catch (err: any) {
    console.error('Error syncing MOCO resources:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
