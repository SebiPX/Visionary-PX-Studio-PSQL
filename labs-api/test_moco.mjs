import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MOCO_API_URL = process.env.MOCO_API_URL || 'https://domain.mocoapp.com/api/v1';
const MOCO_API_KEY = process.env.MOCO_API_KEY || '';

async function mocoFetch(endpoint, options = {}) {
  const response = await fetch(`${MOCO_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Token token=${MOCO_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MOCO API Error ${response.status}: ${text}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function main() {
  try {
    const projects = await mocoFetch('/projects');
    if (projects && projects.length > 0) {
      console.log('Project tasks for', projects[0].id, ':', projects[0].tasks);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
