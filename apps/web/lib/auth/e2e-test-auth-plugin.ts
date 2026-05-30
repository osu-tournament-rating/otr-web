import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { db } from '@/lib/db';

/**
 * Test-only Better Auth plugin that mints a real, signed session for an existing
 * player so the Playwright e2e suite can exercise authenticated and admin-gated
 * flows without going through the osu! OAuth dance.
 *
 * Safety: the plugin is only added to the auth instance when {@link isE2eAuthEnabled}
 * is true, and the endpoint re-checks the flag on every request. It refuses to run
 * in production regardless of the env flag.
 *
 * Endpoint: `POST /api/auth/e2e/sign-in` with body `{ playerId }`. The player must
 * already have an `auth_users` row (created on first real login); admin vs. non-admin
 * is derived from that user's `users.scopes`, exactly like a genuine session.
 */
export const isE2eAuthEnabled = () =>
  process.env.E2E_TEST_AUTH === 'true' && process.env.NODE_ENV !== 'production';

export const e2eTestAuthPlugin = () =>
  ({
    id: 'otr-e2e-test-auth',
    endpoints: {
      e2eSignIn: createAuthEndpoint(
        '/e2e/sign-in',
        {
          method: 'POST',
          body: z.object({
            playerId: z.number().int().positive(),
          }),
          metadata: {
            openapi: {
              operationId: 'e2eSignIn',
              description:
                'Test-only: mint a signed session for an existing player. Disabled outside e2e.',
            },
          },
        },
        async (ctx) => {
          if (!isE2eAuthEnabled()) {
            throw new APIError('NOT_FOUND', { message: 'Not found' });
          }

          const { playerId } = ctx.body;

          const authUser = await db.query.auth_users.findFirst({
            where: eq(schema.auth_users.playerId, playerId),
          });

          if (!authUser) {
            throw new APIError('NOT_FOUND', {
              message: `No auth_users record for player ${playerId}. Log in once via osu! OAuth to create it.`,
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            authUser.id,
            false
          );

          if (!session) {
            throw new APIError('INTERNAL_SERVER_ERROR', {
              message: 'Failed to create session',
            });
          }

          await setSessionCookie(ctx, { session, user: authUser });

          return ctx.json({
            ok: true,
            userId: authUser.id,
            playerId,
            role: authUser.role,
          });
        }
      ),
    },
  }) satisfies BetterAuthPlugin;
