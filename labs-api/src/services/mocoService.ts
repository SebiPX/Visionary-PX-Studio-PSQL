import pool from '../db';

const MOCO_API_URL = process.env.MOCO_API_URL || 'https://domain.mocoapp.com/api/v1';
const MOCO_API_KEY = process.env.MOCO_API_KEY || '';

export async function mocoFetch(endpoint: string, options: RequestInit = {}, impersonateUserId?: number) {
  const headers: Record<string, string> = {
    'Authorization': `Token token=${MOCO_API_KEY}`,
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  if (impersonateUserId) {
    headers['X-IMPERSONATE-USER-ID'] = impersonateUserId.toString();
  }

  const response = await fetch(`${MOCO_API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MOCO API Error ${response.status}: ${text}`);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function pushActivity(
  mocoUserId: number,
  mocoProjectId: number,
  mocoTaskId: number,
  date: string,
  hours: number,
  description: string,
  activityId?: number
) {
  const method = activityId ? 'PUT' : 'POST';
  const url = activityId ? `/activities/${activityId}` : '/activities';

  return await mocoFetch(url, {
    method,
    body: JSON.stringify({
      date,
      project_id: mocoProjectId,
      task_id: mocoTaskId,
      hours,
      description
    })
  }, mocoUserId);
}

export async function syncTimeEntryToMoco(timeEntryId: number) {
  // 1. Fetch time entry details
  const result = await pool.query(`
    SELECT te.*, 
           t.moco_task_id, t.project_id, t.title as task_title, t.description as task_desc,
           p.moco_project_id,
           u.moco_user_id
    FROM agency_time_entries te
    JOIN agency_tasks t ON t.id = te.task_id
    JOIN agency_projects p ON p.id = t.project_id
    JOIN profiles u ON u.id = te.user_id
    WHERE te.id = $1
  `, [timeEntryId]);

  if (result.rows.length === 0) return null;
  const entry = result.rows[0];

  // We only sync submitted/approved entries that have duration
  if (entry.status === 'draft' || !entry.duration_minutes) return null;
  if (!entry.moco_project_id || !entry.moco_user_id) return null;

  let finalMocoTaskId = entry.moco_task_id;

  // 2. Fallback to fetch tasks if no task ID explicitly mapped
  if (!finalMocoTaskId) {
    const mocoProject = await mocoFetch(`/projects/${entry.moco_project_id}`);
    if (mocoProject && mocoProject.tasks && mocoProject.tasks.length > 0) {
      // Just pick the first billing task the user can book to
      finalMocoTaskId = mocoProject.tasks[0].id;
      // Map it for future
      await pool.query('UPDATE agency_tasks SET moco_task_id = $1 WHERE id = $2', [finalMocoTaskId, entry.task_id]);
    } else {
      console.error('MOCO project has no assignable tasks:', entry.moco_project_id);
      return null;
    }
  }

  // 3. Format date and hours
  const dateStr = new Date(entry.start_time).toISOString().split('T')[0];
  const hours = entry.duration_minutes / 60.0;

  // 4. Format description (Fallback to Task Title + Description if no custom entry description)
  let mocoDescription = entry.description;
  if (!mocoDescription) {
    mocoDescription = entry.task_title || 'Zeit erfasst via PX-Flow';
    if (entry.task_desc) {
      mocoDescription += `\n\n${entry.task_desc}`;
    }
  }

  // 5. Push or Update
  const mocoRes = await pushActivity(
    entry.moco_user_id,
    entry.moco_project_id,
    finalMocoTaskId,
    dateStr,
    hours,
    mocoDescription,
    entry.moco_activity_id
  );

  // 5. Store activity ID
  if (!entry.moco_activity_id && mocoRes && mocoRes.id) {
    await pool.query('UPDATE agency_time_entries SET moco_activity_id = $1 WHERE id = $2', [mocoRes.id, timeEntryId]);
  }

  return mocoRes;
}

export async function syncUsers() {
  return await mocoFetch('/users');
}

export async function syncSchedules() {
  return await mocoFetch('/schedules');
}

export async function syncProjects() {
  return await mocoFetch('/projects');
}
