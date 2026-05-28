import dotenv from 'dotenv';
dotenv.config();

import pool from './db';

async function check() {
    try {
        console.log('Checking Michael Walke latest time entries...');
        
        // Find Michael's profile ID
        const userRes = await pool.query(`SELECT id, moco_user_id FROM profiles WHERE email ILIKE '%michael%walke%'`);
        if (userRes.rows.length === 0) {
            console.log('Michael Walke profile not found!');
            return;
        }
        const user = userRes.rows[0];
        console.log(`Found Michael (ID: ${user.id}, MOCO User ID: ${user.moco_user_id})`);

        // Fetch his latest 5 time entries with join details
        const entriesRes = await pool.query(`
            SELECT te.id as time_entry_id, te.duration_minutes, te.moco_activity_id, te.status, te.created_at,
                   t.title as task_title,
                   p.title as project_title, p.moco_project_id
            FROM agency_time_entries te
            JOIN agency_tasks t ON t.id = te.task_id
            JOIN agency_projects p ON p.id = t.project_id
            WHERE te.user_id = $1
            ORDER BY te.created_at DESC
            LIMIT 5
        `, [user.id]);

        console.log(`\nLatest 5 time entries for Michael:`);
        for (const entry of entriesRes.rows) {
            console.log(`- Entry ID: ${entry.time_entry_id} | Status: ${entry.status} | Created: ${entry.created_at}`);
            console.log(`  Project: "${entry.project_title}" (MOCO Project ID: ${entry.moco_project_id || 'NULL'})`);
            console.log(`  Task: "${entry.task_title}"`);
            console.log(`  Duration: ${entry.duration_minutes} mins`);
            console.log(`  MOCO Activity ID: ${entry.moco_activity_id || 'NULL'}`);
            
            // Analyze failure reasons
            if (entry.moco_activity_id) {
                console.log(`  => SYNCED SUCCESSFULLY.`);
            } else {
                if (!entry.duration_minutes || entry.duration_minutes === 0) {
                    console.log(`  => FAILURE REASON: Duration is 0.`);
                } else if (!entry.moco_project_id) {
                    console.log(`  => FAILURE REASON: Project "${entry.project_title}" has NO Moco Project ID linked!`);
                } else if (!user.moco_user_id) {
                    console.log(`  => FAILURE REASON: Michael has NO Moco User ID linked!`);
                } else {
                    console.log(`  => FAILURE REASON: Should have synced! Check Docker logs for MOCO API Error.`);
                }
            }
            console.log('--------------------------------------------------');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}
check();
