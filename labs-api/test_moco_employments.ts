import { mocoFetch } from './src/services/mocoService';

async function test() {
  try {
    const rates = await mocoFetch('/users/933746024/internal_hourly_rates');
    console.log('Internal rates:', JSON.stringify(rates, null, 2));
    
    const users = await mocoFetch('/users/933746024/employments');
    console.log('User employments:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
