import dotenv from 'dotenv';
dotenv.config();

import { pushActivity } from './services/mocoService';

async function test() {
    const projectId = 948422819; // P26092 LHI KI Maßnahmen
    const taskId = 9028983; // We need a valid task ID... wait, I'll fetch it first.
    
    // I don't know the exact task ID, so I'll just use the one from Michael's time entry 
    // by fetching it from the DB
    import('./db').then(async ({ default: pool }) => {
        try {
            const result = await pool.query(`
                SELECT t.moco_task_id as legacy, ps.moco_task_id as service
                FROM agency_time_entries te
                JOIN agency_tasks t ON t.id = te.task_id
                LEFT JOIN agency_project_services ps ON ps.id = t.project_service_id
                WHERE te.id = 'e39a868a-74c0-45a3-8815-c4d48d5f8ca1'
            `);
            const entry = result.rows[0];
            const taskId = entry.service || entry.legacy || 9028983;

            console.log('Testing Impersonation on Project:', projectId, 'Task:', taskId);
            
            console.log('\n--- 1. Testing for Sebastian (ID: 933743433) ---');
            try {
                const resSeb = await pushActivity(
                    933743433, // Sebastian's MOCO ID
                    projectId,
                    taskId,
                    '2026-05-28',
                    0.1, // 6 mins
                    'TEST ENTRY SEBASTIAN'
                );
                console.log('Sebastian Success:', resSeb.id);
            } catch (e: any) {
                console.error('Sebastian Error:', e.message);
            }

            console.log('\n--- 2. Testing for Michael (ID: 933754046) ---');
            try {
                const resMic = await pushActivity(
                    933754046, // Michael's MOCO ID
                    projectId,
                    taskId,
                    '2026-05-28',
                    0.1, // 6 mins
                    'TEST ENTRY MICHAEL'
                );
                console.log('Michael Success:', resMic.id);
            } catch (e: any) {
                console.error('Michael Error:', e.message);
            }

        } finally {
            pool.end();
            process.exit(0);
        }
    });
}

test();
