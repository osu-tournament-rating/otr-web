import { createORPCClient, ORPCError } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { CLIENT_HEADER, DISCORD_BOT_CLIENT } from '@otr/core/logging';
import { injectTraceHeaders } from '@otr/core/tracing';

import type { router } from '@/app/server/oRPC/router';

export type Api = RouterClient<typeof router>;

/** A failed procedure call; `code` is the oRPC code when the site answered. */
export class ApiError extends Error {
  constructor(
    readonly procedure: string,
    readonly code: string | null,
    cause?: unknown
  ) {
    super(
      `${procedure}: ${code ?? (cause instanceof Error ? cause.message : 'failed')}`,
      { cause }
    );
    this.name = 'ApiError';
  }
}

export function createApi(url: string, interactionId?: string): Api {
  const link = new RPCLink({
    url: `${url}/rpc`,
    headers: () =>
      injectTraceHeaders({
        [CLIENT_HEADER]: DISCORD_BOT_CLIENT,
        ...(interactionId ? { 'x-correlation-id': interactionId } : {}),
      }) as Record<string, string>,
    interceptors: [
      async ({ path, next }) => {
        try {
          return await next();
        } catch (cause) {
          throw new ApiError(
            path.join('.'),
            cause instanceof ORPCError ? cause.code : null,
            cause
          );
        }
      },
    ],
  });

  return createORPCClient<Api>(link);
}
