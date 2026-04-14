import { performProjectSync, performResourceSync, performContactSync } from './mocoDbSync';

// Run every 15 minutes (15 * 60 * 1000)
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

let intervalId: NodeJS.Timeout | null = null;

export const startMocoSyncCron = () => {
    if (intervalId) return;

    console.log(`[MOCO Cron] Initializing Background Sync (Interval: ${SYNC_INTERVAL_MS / 60000} mins)...`);

    // Run once immediately on startup
    void runSyncJobs();

    // Schedule regular executions
    intervalId = setInterval(() => {
        void runSyncJobs();
    }, SYNC_INTERVAL_MS);
};

export const stopMocoSyncCron = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[MOCO Cron] Stopped Background Sync.');
    }
};

async function runSyncJobs() {
    try {
        console.log('[MOCO Cron] --- Executing Scheduled Sync Jobs ---');
        await performProjectSync();
        await performResourceSync();
        await performContactSync();
        console.log('[MOCO Cron] --- Scheduled Sync Jobs Finished ---');
    } catch (err) {
        console.error('[MOCO Cron] Execution failed during scheduled run:', err);
    }
}
