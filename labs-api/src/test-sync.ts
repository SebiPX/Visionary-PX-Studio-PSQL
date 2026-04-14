import dotenv from 'dotenv';
dotenv.config();
import { performContactSync } from './services/mocoDbSync';

async function run() {
  try {
    console.log('Running contact sync...');
    const result = await performContactSync();
    console.log('Synced:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
