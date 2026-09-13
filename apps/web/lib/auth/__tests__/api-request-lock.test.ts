import { describe, expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { Pool, PoolClient } from 'pg';
import { ApiRequestLock } from '../api-request-lock';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

class Client extends EventEmitter {
  destroyed = false;
  failUnlock = false;
  async query(text: string) {
    if (text.includes('pg_try_advisory_lock')) {
      return { rows: [{ acquired: true }] };
    }
    if (this.failUnlock) throw new Error('Lost unlock response');
    return { rows: [{ released: true }] };
  }
  release(destroyed: boolean) {
    this.destroyed = destroyed;
  }
}
const setup = (capacity = 10) => {
  const clients: Client[] = [];
  const pool = {
    connect: async () => {
      const client = new Client();
      clients.push(client);
      return client as unknown as PoolClient;
    },
  } as Pick<Pool, 'connect'>;
  return { lock: new ApiRequestLock(pool, capacity), clients };
};

describe('API request lock lifecycle', () => {
  test('keeps another account independent and releases ownership after handler failure', async () => {
    const { lock } = setup();
    const started = deferred();
    const finish = deferred();
    const first = lock.run('first', async () => {
      started.resolve();
      await finish.promise;
      throw new Error('Handler failed');
    });
    const rejection = first.catch((error: unknown) => error);
    await started.promise;
    await expect(lock.run('first', async () => 'bad')).rejects.toMatchObject({
      status: 429,
    });
    expect(await lock.run('second', async () => 'ok')).toBe('ok');
    finish.resolve();
    expect(await rejection).toMatchObject({ message: 'Handler failed' });
    expect(await lock.run('first', async () => 'ok')).toBe('ok');
  });

  test('bounds active lock connections without queueing new work', async () => {
    const { lock, clients } = setup(1);
    const started = deferred();
    const finish = deferred();
    const first = lock.run('first', async () => {
      started.resolve();
      await finish.promise;
    });
    await started.promise;
    await expect(lock.run('second', async () => 'bad')).rejects.toMatchObject({
      status: 503,
    });
    expect(clients).toHaveLength(1);
    finish.resolve();
    await first;
  });

  test('fails closed on lock-connection loss and retains local ownership until work settles', async () => {
    const { lock, clients } = setup();
    const started = deferred();
    const finish = deferred();
    const first = lock.run('owner', async () => {
      started.resolve();
      await finish.promise;
      return 'result';
    });
    const rejection = first.catch((error: unknown) => error);
    await started.promise;
    clients[0].emit('error', new Error('Connection lost'));
    await expect(lock.run('owner', async () => 'bad')).rejects.toMatchObject({
      status: 429,
    });
    finish.resolve();
    expect(await rejection).toMatchObject({ status: 503 });
    expect(clients[0].destroyed).toBe(true);
    expect(await lock.run('owner', async () => 'ok')).toBe('ok');
  });

  test('destroys the connection if unlocking cannot be confirmed', async () => {
    const { lock, clients } = setup();
    await expect(
      lock.run('owner', async () => {
        clients[0].failUnlock = true;
      })
    ).rejects.toMatchObject({ status: 503 });
    expect(clients[0].destroyed).toBe(true);
    expect(await lock.run('owner', async () => 'ok')).toBe('ok');
  });

  test('does not start work when the lock database is unavailable', async () => {
    const pool = {
      connect: async () => {
        throw new Error('Cannot connect');
      },
    } as unknown as Pick<Pool, 'connect'>;
    const lock = new ApiRequestLock(pool);
    let called = false;
    await expect(
      lock.run('owner', async () => {
        called = true;
      })
    ).rejects.toMatchObject({ status: 503 });
    expect(called).toBe(false);
  });
});
