import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import type { BetterAuthPlugin } from 'better-auth';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { db } from '@/lib/db';

/**
 * Test-only plugin: `POST /api/auth/e2e/sign-in` with `{ playerId, admin? }` mints a
 * signed session for an existing player, provisioning its `users`/`auth_users` rows
 * if the local database has none. Gated on {@link isE2eAuthEnabled}, which the
 * endpoint rechecks per request — Playwright runs a production build, so the gate
 * cannot key off NODE_ENV, and the flag must stay unset in staging and prod.
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
