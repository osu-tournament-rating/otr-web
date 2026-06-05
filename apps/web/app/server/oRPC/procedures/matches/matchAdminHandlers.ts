import { ORPCError } from '@orpc/server';
import { eq, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { withAuditUserId } from '@otr/core/db';
import { cascadeMatchRejection } from '@otr/core/db/rejection-cascade';
import { cascadeMatchVerification } from '@otr/core/db/verification-cascade';
import type { MatchAdminUpdateInput } from '@/lib/orpc/schema/match';
import type { DatabaseClient } from '@/lib/db';
import { MatchWarningFlags, VerificationStatus } from '@otr/core/osu';

import {
  ensureAdminDataMutationAllowed,
  ensureAdminSession,
  type AdminDataMutationClockContext,
} from '../shared/adminGuard';

// Pure match-admin handlers, intentionally kept free of the oRPC `../base`
// import (auth, db pool, metrics). This keeps unit tests for the handlers fast
// and free of the heavy transport/auth module graph.

const NOW = sql`CURRENT_TIMESTAMP`;

interface UpdateMatchAdminContext extends AdminDataMutationClockContext {
  db: DatabaseClient;
  session: {
    dbUser?: {
      id: number;
      scopes?: string[] | null;
    } | null;
  } | null;
}

export interface UpdateMatchAdminArgs {
  input: MatchAdminUpdateInput;
  context: UpdateMatchAdminContext;
}

export async function updateMatchAdminHandler({
  input,
  context,
}: UpdateMatchAdminArgs) {
  const { adminUserId } = ensureAdminSession(context.session);
  ensureAdminDataMutationAllowed(context);

  const existing = await context.db.query.matches.findFirst({
    columns: {
      id: true,
      verifiedByUserId: true,
      verificationStatus: true,
    },
    where: eq(schema.matches.id, input.id),
  });

  if (!existing) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Match not found',
    });
  }

  const verificationStatusChanged =
    input.verificationStatus !== existing.verificationStatus;

  const newStatusRequiresReviewer =
    input.verificationStatus === VerificationStatus.Verified ||
    input.verificationStatus === VerificationStatus.Rejected;

  await context.db.transaction((tx) =>
    withAuditUserId(tx, adminUserId, async () => {
      const verifiedByUserId = (() => {
        if (!verificationStatusChanged) {
          return existing.verifiedByUserId;
        }

        if (newStatusRequiresReviewer) {
          return adminUserId;
        }

        return null;
      })();

      const shouldClearWarnings =
        input.verificationStatus === VerificationStatus.Verified ||
        input.verificationStatus === VerificationStatus.Rejected;

      const nextWarningFlags = shouldClearWarnings
        ? MatchWarningFlags.None
        : input.warningFlags;

      await tx
        .update(schema.matches)
        .set({
          name: input.name,
          verificationStatus: input.verificationStatus,
          rejectionReason: input.rejectionReason,
          warningFlags: nextWarningFlags,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          verifiedByUserId,
          updated: NOW,
        })
        .where(eq(schema.matches.id, input.id));

      if (input.verificationStatus === VerificationStatus.Verified) {
        await cascadeMatchVerification(tx, [input.id], { updatedAt: NOW });
      }

      if (input.verificationStatus === VerificationStatus.Rejected) {
        await cascadeMatchRejection(tx, [input.id], {
          updatedAt: NOW,
        });
      }
    })
  );

  return { success: true } as const;
}
