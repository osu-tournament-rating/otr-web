import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { call, ORPCError } from '@orpc/server';
import { APIError } from 'better-auth/api';
import { eq, inArray } from 'drizzle-orm';

import { POST } from '@/app/api/auth/[...all]/route';
import {
  deleteUserApiKey,
  generateUserApiKey,
  getUserApiKeys,
} from '@/app/server/oRPC/procedures/apiKeyProcedures';
import { auth } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import * as schema from '@otr/core/db/schema';

const origin = 'http://localhost:3000';
const limitMessage = 'You can create up to 3 API keys';
const playerIds: number[] = [];
type Owner = { userId: string; headers: Headers };

async function post(path: string, body: unknown, headers?: Headers) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('content-type', 'application/json');
  requestHeaders.set('origin', origin);
  return POST(
    new Request(`${origin}/api/auth${path}`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
    })
  );
}

async function owner(): Promise<Owner> {
  const [player] = await db
    .insert(schema.players)
    .values({ osuId: -Math.floor(Math.random() * 1_000_000_000) - 1 })
    .returning({ id: schema.players.id });
  playerIds.push(player.id);
  const response = await post('/e2e/sign-in', { playerId: player.id });
  assert.equal(response.status, 200, 'fixture session should be created');
  const body = (await response.json()) as { userId: string };
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  assert.ok(cookie, 'fixture should receive a signed session cookie');
  return { userId: body.userId, headers: new Headers({ cookie }) };
}

function createRpc(account: Owner, name = 'quota test') {
  return call(generateUserApiKey, { name }, { context: account });
}

function createDirect(account: Owner, body: Record<string, unknown> = {}) {
  return post(
    '/api-key/create',
    { name: 'quota test', ...body },
    account.headers
  );
}

function keys(account: Owner) {
  return db.query.apiKeys.findMany({
    where: eq(schema.apiKeys.referenceId, account.userId),
  });
}

async function quotaResponse(response: Response) {
  assert.equal(response.status, 409, 'direct auth must reject excess keys');
  const body = (await response.json()) as { code: string; message: string };
  assert.equal(body.code, 'API_KEY_LIMIT_REACHED');
  assert.equal(body.message, limitMessage);
}

async function quotaError(account: Owner) {
  await assert.rejects(createRpc(account), (error: unknown) => {
    assert.ok(error instanceof ORPCError);
    assert.equal(error.code, 'CONFLICT');
    assert.equal(error.message, limitMessage);
    return true;
  });
}

try {
  const first = await owner();
  const second = await owner();

  const anonymous = await post('/api-key/create', { name: 'anonymous' });
  assert.equal(anonymous.status, 401);
  await assert.rejects(
    call(
      generateUserApiKey,
      { name: 'anonymous' },
      { context: { headers: new Headers() } }
    ),
    (error: unknown) =>
      error instanceof ORPCError && error.code === 'UNAUTHORIZED'
  );
  const forged = await createDirect(first, { userId: second.userId });
  assert.equal(forged.status, 401);
  assert.equal((await keys(second)).length, 0);

  const created = await createRpc(first, ' retained secret ');
  assert.equal(created.name, 'retained secret');
  assert.ok(created.key.startsWith('otr-'));
  const [stored] = await keys(first);
  assert.notEqual(stored.key, created.key, 'verification key remains hashed');
  assert.equal(stored.userId, null, 'legacy owner remains unused');
  assert.equal(stored.configId, 'default');
  assert.equal(stored.enabled, true);
  assert.equal(stored.rateLimitEnabled, true);
  assert.equal(stored.rateLimitMax, 60);
  assert.equal(stored.rateLimitTimeWindow, 60_000);
  assert.equal(JSON.parse(stored.metadata!).secret, created.key);
  assert.equal(
    (await auth.api.verifyApiKey({ body: { key: created.key } })).valid,
    true,
    'created keys still authenticate'
  );
  const keyOnlyHeaders = new Headers({
    authorization: `Bearer ${created.key}`,
  });
  assert.equal(
    (await post('/api-key/create', { name: 'without session' }, keyOnlyHeaders))
      .status,
    401
  );
  await assert.rejects(
    call(
      generateUserApiKey,
      { name: 'without session' },
      { context: { headers: keyOnlyHeaders } }
    ),
    (error: unknown) =>
      error instanceof ORPCError && error.code === 'UNAUTHORIZED'
  );
  const listed = await call(getUserApiKeys, undefined, { context: first });
  assert.equal(listed[0].key, created.key);
  assert.equal(
    (await call(getUserApiKeys, undefined, { context: second })).length,
    0
  );
  await assert.rejects(
    call(deleteUserApiKey, { keyId: created.id }, { context: second }),
    (error: unknown) => error instanceof ORPCError && error.code === 'NOT_FOUND'
  );
  assert.equal(
    (await post('/api-key/delete', { keyId: created.id }, second.headers))
      .status,
    404
  );

  const secondKey = await createDirect(first);
  assert.equal(secondKey.status, 200);
  const thirdKey = await createDirect(first, { configId: 'default' });
  assert.equal(thirdKey.status, 200);
  await quotaResponse(await createDirect(first));
  await quotaError(first);
  assert.equal((await keys(first)).length, 3);

  await db
    .update(schema.apiKeys)
    .set({ enabled: false })
    .where(eq(schema.apiKeys.id, created.id));
  await quotaResponse(await createDirect(first));
  await quotaError(first);
  assert.equal(
    (await keys(first)).length,
    3,
    'disabled keys still occupy a slot'
  );
  await call(deleteUserApiKey, { keyId: created.id }, { context: first });
  assert.equal(
    (await createDirect(first)).status,
    200,
    'deletion frees a slot'
  );

  // Both routes race for one remaining slot, while another owner creates keys.
  const concurrent = await owner();
  await createRpc(concurrent);
  await createRpc(concurrent);
  const attempts = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      index % 2 === 0
        ? createDirect(concurrent).then(async (response) => {
            if (response.status === 200) return true;
            await quotaResponse(response);
            return false;
          })
        : createRpc(concurrent).then(
            () => true,
            (error: unknown) => {
              assert.ok(error instanceof ORPCError);
              assert.equal(error.code, 'CONFLICT');
              assert.equal(error.message, limitMessage);
              return false;
            }
          )
    ).concat(
      [0, 1, 2].map(async () => {
        assert.equal((await createDirect(second)).status, 200);
        return false;
      })
    )
  );
  assert.equal(
    attempts.filter(Boolean).length,
    1,
    'only one concurrent request may claim the final slot'
  );
  assert.equal((await keys(concurrent)).length, 3);
  assert.equal(
    (await keys(second)).length,
    3,
    'another owner has independent capacity'
  );

  const distributed = await owner();
  const results = await Promise.all(
    Array.from({ length: 8 }, async (_, index) => {
      const child = Bun.spawn(
        [
          process.execPath,
          fileURLToPath(new URL('./api-key-create-worker.ts', import.meta.url)),
        ],
        {
          env: {
            ...process.env,
            AUTH_QUOTA_TEST_COOKIE: distributed.headers.get('cookie')!,
            AUTH_QUOTA_TEST_ROUTE: index % 2 === 0 ? 'rpc' : 'auth',
          },
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );
      const [output, errors, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited,
      ]);
      assert.equal(exitCode, 0, errors);
      return output.trim().split('\n').at(-1);
    })
  );
  assert.equal(results.filter((result) => result === 'created').length, 3);
  assert.equal(results.filter((result) => result === 'conflict').length, 5);
  assert.equal((await keys(distributed)).length, 3);

  const expired = await owner();
  await db.insert(schema.apiKeys).values(
    [0, 1, 2].map(() => ({
      id: crypto.randomUUID(),
      referenceId: expired.userId,
      userId: second.userId,
      key: 'expired-fixture',
      expiresAt: '2000-01-01T00:00:00.000Z',
    }))
  );
  const { adapter } = await auth.$context;
  for (const model of ['apikey', 'apikeys']) {
    await assert.rejects(
      adapter.transaction((tx) =>
        tx.create({
          model,
          data: { referenceId: expired.userId, key: 'unused-fixture' },
        })
      ),
      (error: unknown) =>
        error instanceof APIError &&
        error.body?.code === 'API_KEY_LIMIT_REACHED'
    );
  }
  assert.equal(
    (await keys(expired)).length,
    3,
    'expired rows count by referenceId'
  );

  // Preserve pre-existing excess keys while denying further creation.
  await db.insert(schema.apiKeys).values({
    id: crypto.randomUUID(),
    referenceId: first.userId,
    key: 'legacy-excess-fixture',
  });
  await quotaResponse(await createDirect(first));
  await quotaError(first);
  assert.equal((await keys(first)).length, 4);
  assert.equal(
    (await call(getUserApiKeys, undefined, { context: first })).length,
    4
  );
} finally {
  if (playerIds.length > 0) {
    await db
      .delete(schema.users)
      .where(inArray(schema.users.playerId, playerIds));
    await db
      .delete(schema.players)
      .where(inArray(schema.players.id, playerIds));
  }
  await db.$client.end();
}
