import { defaultKeyHasher } from '@better-auth/api-key';
import { apiKeys } from '@otr/core/db/schema';
import { and, eq } from 'drizzle-orm';
import { Pool } from 'pg';

import { db } from '@/lib/db';
import {
  API_REQUEST_LOCK_POOL_SIZE,
  ApiRequestLock,
  createApiRequestUnavailableError,
} from './api-request-lock';

const LOCK_QUERY_TIMEOUT_MS = 5000;

// Holding a connection from the application pool would prevent saturated API
// requests from obtaining the connections needed by authentication and queries.
const lockPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: API_REQUEST_LOCK_POOL_SIZE,
  connectionTimeoutMillis: LOCK_QUERY_TIMEOUT_MS,
  query_timeout: LOCK_QUERY_TIMEOUT_MS,
});
lockPool.on('error', () => {
  console.error('[api-request-lock] Idle database connection failed');
});
const requestLock = new ApiRequestLock(lockPool);

export async function withApiKeyRequest<T>(
  candidate: string,
  operation: () => Promise<T>
): Promise<T> {
  let owner;
  try {
    owner = await db.query.apiKeys.findFirst({
      columns: { referenceId: true, enabled: true, expiresAt: true },
      where: and(
        eq(apiKeys.key, await defaultKeyHasher(candidate)),
        eq(apiKeys.configId, 'default')
      ),
    });
  } catch {
    throw createApiRequestUnavailableError();
  }

  // Better Auth remains responsible for authentication and its existing errors.
  if (
    !owner ||
    owner.enabled === false ||
    (owner.expiresAt && new Date(owner.expiresAt).getTime() < Date.now())
  ) {
    return operation();
  }
  return requestLock.run(owner.referenceId, operation);
}
