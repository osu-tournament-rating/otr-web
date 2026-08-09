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
 * is true, and the endpoint re-checks the flag on every request. The flag must be
 * left unset (or false) in staging/prod configs — Playwright tests the production
 * build (`next start`, NODE_ENV=production), so the gate cannot key off NODE_ENV.
 *
 * Endpoint: `POST /api/auth/e2e/sign-in` with body `{ playerId, admin? }`. The player
 * must exist; if it has no `users`/`auth_users` rows yet (e.g. the local database was
 * restored from a dump that excludes auth tables), they are provisioned on the fly,
 * with `admin: true` granting the `admin` scope the same way a real login would read it.
 */
export const isE2eAuthEnabled = () => process.env.E2E_TEST_AUTH === 'true';

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
            admin: z.boolean().optional(),
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

          const { playerId, admin = false } = ctx.body;

          let authUser = await db.query.auth_users.findFirst({
            where: eq(schema.auth_users.playerId, playerId),
          });

          if (!authUser) {
            const player = await db.query.players.findFirst({
              where: eq(schema.players.id, playerId),
            });

            if (!player) {
              throw new APIError('NOT_FOUND', {
                message: `No player with id ${playerId}.`,
              });
            }

            await db
              .insert(schema.users)
              .values({
                playerId,
                scopes: admin ? ['admin'] : ['whitelist'],
              })
              .onConflictDoNothing({ target: schema.users.playerId });

            [authUser] = await db
              .insert(schema.auth_users)
              .values({
                id: crypto.randomUUID(),
                name: player.username,
                email: `e2e-player-${playerId}@otr.local`,
                emailVerified: true,
                playerId,
                role: admin ? 'admin' : null,
              })
              .returning();
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
