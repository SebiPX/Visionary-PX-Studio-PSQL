import dotenv from 'dotenv';
dotenv.config();

import { mocoFetch } from './services/mocoService';

async function test() {
    console.log('Fetching Project P26092 LHI KI Maßnahmen (ID: 948422819)...');
    try {
        const project = await mocoFetch('/projects/948422819');
        if (project) {
            console.log('\n--- Project Contracts (Assigned Users) ---');
            if (project.contracts && project.contracts.length > 0) {
                for (const contract of project.contracts) {
                    console.log(`- User ID: ${contract.user_id} | Active: ${contract.active} | Rate: ${contract.hourly_rate}`);
                }
            } else {
                console.log('No contracts (users) assigned to this project.');
            }
        }
    } catch (e: any) {
        console.error('\n--- MOCO API ERROR CAUGHT ---');
        console.error(e.message);
    }
    process.exit(0);
}

test();
