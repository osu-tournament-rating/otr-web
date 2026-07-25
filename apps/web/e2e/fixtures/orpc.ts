import { readFileSync } from 'node:fs';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';

import type { router } from '../../app/server/oRPC/router';
import { STORAGE_STATE, type TestRole } from './auth';

const BASE_URL = 'http://localhost:3001';

/**
 * Builds a `Cookie` header from a Playwright storage-state file so server calls
 * carry the same authenticated session the browser project uses.
 */
function cookieHeaderFromStorageState(path: string): string {
  const state = JSON.parse(readFileSync(path, 'utf8')) as {
    cookies?: Array<{ name: string; value: string }>;
  };
  return (state.cookies ?? [])
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

/**
 * Creates an oRPC client authenticated as the given test role. Used by specs that
 * need to seed deterministic server state (e.g. an admin-resolved report) before
 * asserting on the UI. Read the storage state lazily — the setup project writes it
 * before tests run, but after test files are collected.
 */
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
