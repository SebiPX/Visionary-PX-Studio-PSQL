import { syncUsers } from './src/services/mocoService';

async function test() {
  try {
    const users = await syncUsers();
    console.log('User sample:', JSON.stringify(users[0], null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
