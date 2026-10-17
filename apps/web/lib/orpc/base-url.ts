import { optionalEnv } from '@otr/core/utils/env';

/**
 * The origin server-side oRPC calls go to. A blank INTERNAL_APP_BASE_URL
 * falls back to the public URL instead of leaving the calls on `/rpc`.
 */
export const serverRpcBaseUrl = (): string | undefined =>
  optionalEnv(process.env.INTERNAL_APP_BASE_URL) ??
  optionalEnv(process.env.NEXT_PUBLIC_APP_BASE_URL);
