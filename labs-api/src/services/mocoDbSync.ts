import pool from '../db';
import { syncProjects, syncUsers, syncSchedules } from './mocoService';

export async function performProjectSync() {
  console.log('[MOCO Cron] Starting Project Sync...');
  try {
    const mocoProjects = await syncProjects();

    if (!Array.isArray(mocoProjects)) {
      throw new Error('Failed to fetch MOCO projects');
    }

    let importedCount = 0;
    for (const p of mocoProjects) {
      let clientId = null;
      const mocoCustomer = p.customer || p.company; // MOCO API uses 'customer'

      if (mocoCustomer) {
        const clientRes = await pool.query('SELECT id FROM agency_clients WHERE moco_company_id = $1', [mocoCustomer.id]);
        if (clientRes.rows.length > 0) {
          clientId = clientRes.rows[0].id;
        } else {
          const clientNameRes = await pool.query('SELECT id FROM agency_clients WHERE company_name = $1', [mocoCustomer.name]);
          if (clientNameRes.rows.length > 0) {
             clientId = clientNameRes.rows[0].id;
             await pool.query('UPDATE agency_clients SET moco_company_id = $1 WHERE id = $2', [mocoCustomer.id, clientId]);
          } else {
             const newClientRes = await pool.query(
               'INSERT INTO agency_clients (company_name, moco_company_id, status) VALUES ($1, $2, $3) RETURNING id',
               [mocoCustomer.name || 'Unknown MOCO Client', mocoCustomer.id, 'active']
             );
             clientId = newClientRes.rows[0].id;
          }
        }
      }

      if (!clientId) {
        const fallbackRes = await pool.query("SELECT id FROM agency_clients WHERE company_name = 'Interne Projekte (MOCO)'");
        if (fallbackRes.rows.length > 0) {
          clientId = fallbackRes.rows[0].id;
        } else {
          const newFallback = await pool.query(
            "INSERT INTO agency_clients (company_name, status) VALUES ($1, $2) RETURNING id",
            ['Interne Projekte (MOCO)', 'active']
          );
          clientId = newFallback.rows[0].id;
        }
      }

      const budget = p.budget || 0;
      const deadline = p.finish_date || null;
      const startDate = p.start_date || null;
      let projectId;

      const projRes = await pool.query('SELECT id FROM agency_projects WHERE moco_project_id = $1', [p.id]);
      if (projRes.rows.length === 0) {
        const newProjRes = await pool.query(`
          INSERT INTO agency_projects (title, moco_project_id, client_id, status, budget_total, deadline, start_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [p.name || 'Unnamed Project', p.id, clientId, 'active', budget, deadline, startDate]);
        projectId = newProjRes.rows[0].id;
        importedCount++;
      } else {
        projectId = projRes.rows[0].id;
        await pool.query(`
          UPDATE agency_projects 
          SET title = $1, budget_total = $2, deadline = $3, start_date = $4, updated_at = NOW()
          WHERE id = $5
        `, [p.name || 'Unnamed Project', budget, deadline, startDate, projectId]);
      }

      if (p.leader && p.leader.id) {
        const leaderRes = await pool.query('SELECT id FROM profiles WHERE moco_user_id = $1', [p.leader.id]);
        if (leaderRes.rows.length > 0) {
          const profileId = leaderRes.rows[0].id;
          
          const memberRes = await pool.query('SELECT role FROM agency_project_members WHERE project_id = $1 AND user_id = $2', [projectId, profileId]);
          
          if (memberRes.rows.length === 0) {
            await pool.query(`
              INSERT INTO agency_project_members (project_id, user_id, role, hourly_rate)
              VALUES ($1, $2, $3, $4)
            `, [projectId, profileId, 'PJM', 0]);
          } else if (memberRes.rows[0].role !== 'PJM') {
            await pool.query(`
              UPDATE agency_project_members SET role = 'PJM' WHERE project_id = $1 AND user_id = $2
            `, [projectId, profileId]);
          }
        }
      }
      
      if (Array.isArray(p.contracts)) {
        for (const contract of p.contracts) {
          if (contract.user_id && contract.active) {
            const userRes = await pool.query('SELECT id FROM profiles WHERE moco_user_id = $1', [contract.user_id]);
            if (userRes.rows.length > 0) {
              const profileId = userRes.rows[0].id;
              const rate = contract.hourly_rate || 0;
              
              const memberRes = await pool.query('SELECT role FROM agency_project_members WHERE project_id = $1 AND user_id = $2', [projectId, profileId]);
              
              if (memberRes.rows.length === 0) {
                await pool.query(`
                  INSERT INTO agency_project_members (project_id, user_id, role, hourly_rate)
                  VALUES ($1, $2, $3, $4)
                `, [projectId, profileId, 'member', rate]);
              } else {
                await pool.query(`
                  UPDATE agency_project_members SET hourly_rate = $1 WHERE project_id = $2 AND user_id = $3
                `, [rate, projectId, profileId]);
              }
            }
          }
        }
      }

function cleanMocoHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>?/gm, '') // Remove all HTML tags including ul, ol
    .replace(/<!--.*?-->/g, '') // Remove HTML comments
    .trim();
}

      if (Array.isArray(p.tasks)) {
        for (const task of p.tasks) {
          const taskRes = await pool.query('SELECT id FROM agency_tasks WHERE moco_task_id = $1 AND project_id = $2', [task.id, projectId]);
          
          let estHours = null;
          const rate = task.hourly_rate || null;
          if (task.budget && rate && rate > 0) {
             estHours = task.budget / rate;
          }

          const mocoStatus = task.active ? 'todo' : 'completed';
          const cleanDesc = cleanMocoHtml(task.description);
          
          if (taskRes.rows.length === 0) {
            await pool.query(`
              INSERT INTO agency_tasks (project_id, title, description, status, estimated_rate, estimated_hours, is_visible_to_client, moco_task_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [projectId, task.name, cleanDesc, mocoStatus, rate, estHours, task.billable, task.id]);
          } else {
            await pool.query(`
              UPDATE agency_tasks 
              SET title = $1, description = $2, 
                  status = CASE WHEN $3 = 'completed' THEN 'completed' ELSE status END, 
                  estimated_rate = $4, estimated_hours = $5, is_visible_to_client = $6, updated_at = NOW()
              WHERE moco_task_id = $7 AND project_id = $8
            `, [task.name, cleanDesc, mocoStatus, rate, estHours, task.billable, task.id, projectId]);
          }
        }
      }
    }
    console.log(`[MOCO Cron] Project Sync complete. Imported/Updated: ${importedCount}`);
    return importedCount;
  } catch (err) {
    console.error('[MOCO Cron] Error syncing MOCO projects:', err);
    throw err;
  }
}

export async function performResourceSync() {
  console.log('[MOCO Cron] Starting Resources & Absences Sync...');
  try {
    const mocoUsers = await syncUsers();
    let usersMapped = 0;
    
    if (Array.isArray(mocoUsers)) {
      for (const mu of mocoUsers) {
        if (mu.email) {
          const updateRes = await pool.query(
            `UPDATE profiles SET moco_user_id = $1 WHERE email = $2 RETURNING id`,
            [mu.id, mu.email]
          );
          if (updateRes.rows.length > 0) usersMapped++;
        }
      }
    }

    const mocoSchedules = await syncSchedules();
    let absencesImported = 0;

    if (Array.isArray(mocoSchedules)) {
      for (const entry of mocoSchedules) {
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

    console.log(`[MOCO Cron] Resources Sync complete. Users mapped: ${usersMapped}, Absences imported: ${absencesImported}`);
    return { usersMapped, absencesImported };
  } catch (err) {
    console.error('[MOCO Cron] Error syncing MOCO resources:', err);
    throw err;
  }
}
