import assert from 'node:assert/strict';
import { call, ORPCError } from '@orpc/server';

import { POST } from '@/app/api/auth/[...all]/route';
import { generateUserApiKey } from '@/app/server/oRPC/procedures/apiKeyProcedures';
import { db } from '@/lib/db';

const headers = new Headers({ cookie: process.env.AUTH_QUOTA_TEST_COOKIE! });
let created = false;

try {
  if (process.env.AUTH_QUOTA_TEST_ROUTE === 'rpc') {
    try {
      await call(
        generateUserApiKey,
        { name: 'process test' },
        { context: { headers } }
      );
      created = true;
    } catch (error) {
      assert.ok(error instanceof ORPCError);
      assert.equal(error.code, 'CONFLICT');
      assert.equal(error.message, 'You can create up to 3 API keys');
    }
  } else {
    headers.set('content-type', 'application/json');
    headers.set('origin', 'http://localhost:3000');
    const response = await POST(
      new Request('http://localhost:3000/api/auth/api-key/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'process test' }),
      })
    );
    created = response.status === 200;
    if (!created) {
      assert.equal(response.status, 409);
      const body = (await response.json()) as { code: string; message: string };
      assert.equal(body.code, 'API_KEY_LIMIT_REACHED');
      assert.equal(body.message, 'You can create up to 3 API keys');
    }
  }
  console.log(created ? 'created' : 'conflict');
} finally {
  await db.$client.end();
}
