import { ORPCError } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import {
  GameScoreAdminMutationResponseSchema,
  GameScoreAdminUpdateInputSchema,
} from '@/lib/orpc/schema/match';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

export const updateScoreAdmin = protectedProcedure
  .input(GameScoreAdminUpdateInputSchema)
  .output(GameScoreAdminMutationResponseSchema)
  .route({
    summary: 'Admin: update game score',
    tags: ['admin'],
    path: '/scores/admin/update',
  })
  .handler(async ({ input, context }) => {
    ensureAdminSession(context.session);

    const existing = await context.db.query.gameScores.findFirst({
      columns: { id: true },
      where: eq(schema.gameScores.id, input.id),
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Score not found',
      });
    }

    await context.db
      .update(schema.gameScores)
      .set({
        score: input.score,
        placement: input.placement,
        maxCombo: input.maxCombo,
        count50: input.count50,
        count100: input.count100,
        count300: input.count300,
        countMiss: input.countMiss,
        countKatu: input.countKatu,
        countGeki: input.countGeki,
        grade: input.grade,
        mods: input.mods,
        team: input.team,
        ruleset: input.ruleset,
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason,
        updated: NOW,
      })
      .where(eq(schema.gameScores.id, input.id));

    return { success: true } as const;
  });
