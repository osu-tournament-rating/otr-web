import { readFileSync } from 'node:fs';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';

import type { router } from '../../app/server/oRPC/router';
import { STORAGE_STATE, type TestRole } from './auth';

const BASE_URL = 'http://localhost:3001';

function cookieHeaderFromStorageState(path: string): string {
  const state = JSON.parse(readFileSync(path, 'utf8')) as {
    cookies?: Array<{ name: string; value: string }>;
  };
  return (state.cookies ?? [])
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

/** oRPC client for a test role; storage state is read lazily, after collection. */
export function createOrpcClientForRole(
  role: TestRole
): RouterClient<typeof router> {
  const cookie = cookieHeaderFromStorageState(STORAGE_STATE[role]);
  const link = new RPCLink({
    url: `${BASE_URL}/rpc`,
    headers: () => ({ cookie }),
  });
  return createORPCClient(link);
}
