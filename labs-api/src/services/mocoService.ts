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
  description: string
) {
  return await mocoFetch('/activities', {
    method: 'POST',
    body: JSON.stringify({
      date,
      project_id: mocoProjectId,
      task_id: mocoTaskId,
      hours,
      description
    })
  }, mocoUserId);
}

export async function syncUsers() {
  const users = await mocoFetch('/users');
  return users;
}

export async function syncSchedules() {
  const schedules = await mocoFetch('/schedules');
  return schedules;
}

export async function syncProjects() {
  const projects = await mocoFetch('/projects');
  return projects;
}
