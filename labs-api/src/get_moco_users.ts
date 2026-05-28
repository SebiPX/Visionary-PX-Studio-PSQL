import dotenv from 'dotenv';
dotenv.config();

import { syncUsers } from './services/mocoService';

async function test() {
    console.log('Fetching all MOCO users...');
    try {
        const users = await syncUsers();
        if (Array.isArray(users)) {
            const michaels = users.filter((u: any) => u.email && u.email.toLowerCase().includes('michael.walke'));
            console.log('\nFound users matching "michael.walke":');
            console.log(JSON.stringify(michaels, null, 2));
            
            const sebastians = users.filter((u: any) => u.email && u.email.toLowerCase().includes('sebastian.geller'));
            console.log('\nFound users matching "sebastian.geller":');
            console.log(JSON.stringify(sebastians, null, 2));
        }
    } catch (e: any) {
        console.error('\n--- MOCO API ERROR CAUGHT ---');
        console.error(e.message);
    }
    process.exit(0);
}

test();
