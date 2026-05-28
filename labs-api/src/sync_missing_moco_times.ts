import dotenv from 'dotenv';
dotenv.config();

import pool from './db';
import { syncTimeEntryToMoco } from './services/mocoService';

async function main() {
    console.log('Fetching time entries that need to be synced to MOCO...');
    
    try {
        // We look for time entries with duration > 0, that don't have a moco_activity_id yet
        const result = await pool.query(`
            SELECT id, user_id, duration_minutes 
            FROM agency_time_entries 
            WHERE moco_activity_id IS NULL AND duration_minutes > 0
        `);

        const entries = result.rows;
        console.log(`Found ${entries.length} time entries to sync.`);

        let successCount = 0;
        let failCount = 0;

        for (const entry of entries) {
            console.log(`Syncing time entry ${entry.id}...`);
            try {
                const mocoRes = await syncTimeEntryToMoco(entry.id);
                if (mocoRes && mocoRes.id) {
                    console.log(`  -> Success! MOCO Activity ID: ${mocoRes.id}`);
                    successCount++;
                } else {
                    console.log(`  -> Skipped (User might not be mapped or project invalid)`);
                    failCount++;
                }
            } catch (err: any) {
                console.error(`  -> Failed:`, err.message);
                failCount++;
            }
            
            // small delay to prevent rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`\nSync finished. Success: ${successCount}, Failed/Skipped: ${failCount}`);

    } catch (err) {
        console.error('Error fetching time entries:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
