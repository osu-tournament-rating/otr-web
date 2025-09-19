import { ORPCError } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';

import * as schema from '@/lib/db/schema';
import {
  MatchAdminMutationResponseSchema,
  MatchAdminUpdateInputSchema,
} from '@/lib/orpc/schema/match';
import { VerificationStatus } from '@/lib/osu/enums';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const NOW = sql`CURRENT_TIMESTAMP`;

export const updateMatchAdmin = protectedProcedure
  .input(MatchAdminUpdateInputSchema)
  .output(MatchAdminMutationResponseSchema)
  .route({
    summary: 'Admin: update match',
    tags: ['admin'],
    path: '/matches/admin/update',
  })
  .handler(async ({ input, context }) => {
    const { adminUserId } = ensureAdminSession(context.session);

    const existing = await context.db.query.matches.findFirst({
      columns: { id: true },
      where: eq(schema.matches.id, input.id),
    });

    if (!existing) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Match not found',
      });
    }

    const shouldAssignReviewer =
      input.verificationStatus === VerificationStatus.Verified ||
      input.verificationStatus === VerificationStatus.Rejected;

    await context.db
      .update(schema.matches)
      .set({
        name: input.name,
        verificationStatus: input.verificationStatus,
        rejectionReason: input.rejectionReason,
        warningFlags: input.warningFlags,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        verifiedByUserId: shouldAssignReviewer ? adminUserId : null,
        updated: NOW,
      })
      .where(eq(schema.matches.id, input.id));

    return { success: true } as const;
  });
