import dotenv from 'dotenv';
dotenv.config();

import { syncTimeEntryToMoco } from './services/mocoService';

async function test() {
    console.log('Attempting to force-sync Entry ID: e39a868a-74c0-45a3-8815-c4d48d5f8ca1');
    try {
        const res = await syncTimeEntryToMoco('e39a868a-74c0-45a3-8815-c4d48d5f8ca1' as any);
        console.log('\n--- SUCCESS ---');
        console.log('Result:', JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error('\n--- MOCO API ERROR CAUGHT ---');
        console.error(e.message);
    }
    process.exit(0);
}

test();
