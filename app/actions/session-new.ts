'use server';

import redis from '@/lib/redis';

export async function testRedis() {
  redis.set('test-key', 'yay redis huge W', () => {
    console.log('set callback?')
  });

  redis.get('test-key', (err, result) => {
    if (err) {
      console.error(err);
    } else {
      console.log('got:', result);
    }
  });
}