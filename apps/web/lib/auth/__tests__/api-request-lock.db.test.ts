import { afterAll, describe, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { ApiRequestLock } from '../api-request-lock';

const databaseUrl = process.env.API_REQUEST_CONCURRENCY_TEST_DATABASE_URL;
if (
  databaseUrl &&
  process.env.CI !== 'true' &&
  new URL(databaseUrl).port !== '5434'
) {
  throw new Error(
    'API request concurrency tests require a disposable database on port 5434'
  );
}
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const pools: Pool[] = [];
const pool = () => {
  const result = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 1000,
  });
  pools.push(result);
  return result;
};
afterAll(async () => {
  await Promise.all(pools.map((entry) => entry.end()));
});

(databaseUrl ? describe : describe.skip)(
  'API request locks across database sessions',
  () => {
    test('rejects another instance for the account while allowing another account and the application pool', async () => {
      const first = new ApiRequestLock(pool());
      const second = new ApiRequestLock(pool());
      const application = pool();
      const owner = crypto.randomUUID();
      const started = deferred();
      const finish = deferred();
      const active = first.run(owner, async () => {
        started.resolve();
        await finish.promise;
      });
      await started.promise;
      try {
        await expect(
          second.run(owner, async () => 'bad')
        ).rejects.toMatchObject({ status: 429 });
        expect(
          await second.run(crypto.randomUUID(), async () => 'independent')
        ).toBe('independent');
        expect(
          (await application.query('SELECT 1 AS value')).rows[0].value
        ).toBe(1);
      } finally {
        finish.resolve();
        await active;
      }
      expect(await second.run(owner, async () => 'released')).toBe('released');
    });

    test('releases the database lock after rejected work', async () => {
      const first = new ApiRequestLock(pool());
      const second = new ApiRequestLock(pool());
      const owner = crypto.randomUUID();
      await expect(
        first.run(owner, async () => {
          throw new Error('procedure failure');
        })
      ).rejects.toThrow('procedure failure');
      expect(await second.run(owner, async () => 'released')).toBe('released');
    });
  }
);
