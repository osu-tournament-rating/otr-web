import { ORPCError } from '@orpc/server';
import { and, eq, inArray } from 'drizzle-orm';

import { TournamentRejectionReason, VerificationStatus } from '@/lib/osu/enums';
import * as schema from '@/lib/db/schema';
import {
  TournamentSubmissionInputSchema,
  TournamentSubmissionResponseSchema,
} from '@/lib/orpc/schema/tournamentSubmission';

import { protectedProcedure } from '../base';
import { ensureAdminSession } from '../shared/adminGuard';

const formatIdList = (ids: readonly number[], limit = 5) => {
  if (ids.length <= limit) {
    return ids.join(', ');
  }

  const shown = ids.slice(0, limit).join(', ');
  return `${shown} and ${ids.length - limit} more`;
};

type DatabaseError = Error & {
  code?: string;
  detail?: string;
  constraint?: string;
};

const isDatabaseError = (error: unknown): error is DatabaseError =>
  Boolean(error) &&
  typeof error === 'object' &&
  'code' in (error as Record<string, unknown>);

const NAME_AND_ABBREVIATION_CONFLICT_MESSAGE =
  'A tournament with this name and abbreviation already exists. Please double-check before submitting.';

export const submitTournament = protectedProcedure
  .input(TournamentSubmissionInputSchema)
  .output(TournamentSubmissionResponseSchema)
  .errors({
    ACCOUNT_RESOLUTION_FAILED: {
      status: 403,
      message: 'Failed to resolve account.',
    },
    NAME_ABBREVIATION_CONFLICT: {
      status: 409,
      message: NAME_AND_ABBREVIATION_CONFLICT_MESSAGE,
    },
    MATCH_ASSIGNMENT_CONFLICT: {
      status: 409,
    },
    TOURNAMENT_CREATION_FAILED: {
      status: 500,
      message: 'Failed to create tournament.',
    },
    DUPLICATE_TOURNAMENT_DETAILS: {
      status: 409,
      message:
        'A tournament with the provided details already exists. Please review the submission and try again.',
    },
    SUBMISSION_FAILED: {
      status: 500,
      message:
        'Something went wrong while submitting the tournament. Please try again or contact the o!TR team.',
    },
  })
  .route({
    summary: 'Submit tournament for verification',
    tags: ['protected'],
    path: '/tournaments/submit',
  })
  .handler(async ({ input, context, errors }) => {
    const { session, db } = context;

    const submittingUserId = session.dbUser?.id ?? null;

    if (!submittingUserId) {
      throw errors.ACCOUNT_RESOLUTION_FAILED();
    }

    const rejectionReason =
      input.rejectionReason ?? TournamentRejectionReason.None;

    if (rejectionReason !== TournamentRejectionReason.None) {
      ensureAdminSession(session);
    }

    try {
      const response = await db.transaction(async (tx) => {
        const existingWithNameAndAbbreviation =
          await tx.query.tournaments.findFirst({
            columns: { id: true },
            where: and(
              eq(schema.tournaments.name, input.name),
              eq(schema.tournaments.abbreviation, input.abbreviation)
            ),
          });

        if (existingWithNameAndAbbreviation) {
          throw errors.NAME_ABBREVIATION_CONFLICT();
        }

        const [tournament] = await tx
          .insert(schema.tournaments)
          .values({
            name: input.name,
            abbreviation: input.abbreviation,
            forumUrl: input.forumUrl,
            rankRangeLowerBound: input.rankRangeLowerBound,
            ruleset: input.ruleset,
            lobbySize: input.lobbySize,
            rejectionReason,
            verificationStatus:
              rejectionReason === TournamentRejectionReason.None
                ? VerificationStatus.None
                : VerificationStatus.Rejected,
            submittedByUserId: submittingUserId,
          })
          .returning({ id: schema.tournaments.id });

        if (!tournament) {
          throw errors.TOURNAMENT_CREATION_FAILED();
        }

        const tournamentId = tournament.id;

        const matchOsuIds = Array.from(new Set(input.ids)) as number[];

        const existingMatches = matchOsuIds.length
          ? await tx
              .select({
                osuId: schema.matches.osuId,
                tournamentId: schema.matches.tournamentId,
              })
              .from(schema.matches)
              .where(inArray(schema.matches.osuId, matchOsuIds))
          : [];

        const conflictingMatches = existingMatches.filter(
          (match) =>
            match.tournamentId !== null && match.tournamentId !== tournamentId
        );

        if (conflictingMatches.length) {
          throw errors.MATCH_ASSIGNMENT_CONFLICT({
            message: `The following matches are already assigned to another tournament: ${formatIdList(
              conflictingMatches.map((match) => Number(match.osuId))
            )}.`,
          });
        }

        const matchesToUpdate = existingMatches.filter(
          (match) => match.tournamentId === null
        );

        for (const match of matchesToUpdate) {
          await tx
            .update(schema.matches)
            .set({
              tournamentId,
              submittedByUserId: submittingUserId,
            })
            .where(eq(schema.matches.osuId, match.osuId));
        }

        const matchesToInsert = matchOsuIds.filter(
          (osuId) => !existingMatches.some((match) => match.osuId === osuId)
        );

        if (matchesToInsert.length) {
          await tx.insert(schema.matches).values(
            matchesToInsert.map((osuId) => ({
              osuId,
              tournamentId,
              submittedByUserId: submittingUserId,
              verificationStatus: VerificationStatus.None,
              rejectionReason: 0,
              warningFlags: 0,
            }))
          );
        }

        const beatmapOsuIds = Array.from(new Set(input.beatmapIds)) as number[];

        if (beatmapOsuIds.length) {
          const beatmapRows = await tx
            .select({
              id: schema.beatmaps.id,
              osuId: schema.beatmaps.osuId,
            })
            .from(schema.beatmaps)
            .where(inArray(schema.beatmaps.osuId, beatmapOsuIds));

          if (beatmapRows.length) {
            await tx
              .insert(schema.joinPooledBeatmaps)
              .values(
                beatmapRows.map((beatmap) => ({
                  pooledBeatmapsId: beatmap.id,
                  tournamentsPooledInId: tournamentId,
                }))
              )
              .onConflictDoNothing();
          }
        }

        return { id: tournamentId };
      });

      return response;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      if (isDatabaseError(error) && error.code === '23505') {
        const detail = error.detail ?? '';
        const constraint = error.constraint ?? '';

        if (
          constraint === 'ix_tournaments_name_abbreviation' ||
          detail.includes('(name, abbreviation)')
        ) {
          throw errors.NAME_ABBREVIATION_CONFLICT();
        }

        throw errors.DUPLICATE_TOURNAMENT_DETAILS();
      }

      console.error('Failed to submit tournament', error);

      throw errors.SUBMISSION_FAILED();
    }
  });
