import { and, inArray, ne, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  GameWarningFlags,
  MatchWarningFlags,
  VerificationStatus,
} from '../osu/enums';
import * as schema from './schema';

export interface VerificationCascadeResult {
  matchCount: number;
  gameCount: number;
  scoreCount: number;
}

type MutationClient = Pick<
  NodePgDatabase<Record<string, unknown>>,
  'update' | 'select'
>;

type TimestampValue = string | SQL<unknown>;

type CascadeOptions = {
  updatedAt?: TimestampValue;
};

function normalizeIds(ids: readonly number[]): number[] {
  const seen = new Set<number>();

  for (const id of ids) {
    if (typeof id !== 'number' || !Number.isFinite(id)) {
      continue;
    }

    const normalized = Math.trunc(id);
    if (!seen.has(normalized)) {
      seen.add(normalized);
    }
  }

  return Array.from(seen.values());
}

const DEFAULT_TIMESTAMP = sql`CURRENT_TIMESTAMP`;

function resolveTimestamp(value?: TimestampValue): TimestampValue {
  return value ?? DEFAULT_TIMESTAMP;
}

/**
 * Cascade verification to scores under verified games.
 * Updates scores that are not already Verified or Rejected.
 */
async function cascadeScoresVerification(
  db: MutationClient,
  gameIds: number[],
  updatedAt: TimestampValue
): Promise<number> {
  if (gameIds.length === 0) {
    return 0;
  }

  const updatedScores = await db
    .update(schema.gameScores)
    .set({
      verificationStatus: VerificationStatus.Verified,
      rejectionReason: 0,
      updated: updatedAt,
    })
    .where(
      and(
        inArray(schema.gameScores.gameId, gameIds),
        ne(schema.gameScores.verificationStatus, VerificationStatus.Verified),
        ne(schema.gameScores.verificationStatus, VerificationStatus.Rejected)
      )
    )
    .returning({ id: schema.gameScores.id });

  return updatedScores.length;
}

/**
 * Cascade verification to games under verified matches.
 * Updates games that are not already Verified or Rejected.
 * Clears warning flags on updated games.
 */
async function cascadeGamesVerification(
  db: MutationClient,
  matchIds: number[],
  updatedAt: TimestampValue
): Promise<{ gameIds: number[]; gameCount: number }> {
  if (matchIds.length === 0) {
    return { gameIds: [], gameCount: 0 };
  }

  const updatedGames = await db
    .update(schema.games)
    .set({
      verificationStatus: VerificationStatus.Verified,
      rejectionReason: 0,
      warningFlags: GameWarningFlags.None,
      updated: updatedAt,
    })
    .where(
      and(
        inArray(schema.games.matchId, matchIds),
        ne(schema.games.verificationStatus, VerificationStatus.Verified),
        ne(schema.games.verificationStatus, VerificationStatus.Rejected)
      )
    )
    .returning({ id: schema.games.id });

  const gameIds = updatedGames.map((game) => game.id);

  return { gameIds, gameCount: updatedGames.length };
}

/**
 * Cascade verification to matches under a verified tournament.
 * Updates matches that are not already Verified or Rejected.
 * Clears warning flags on updated matches.
 */
async function cascadeMatchesVerification(
  db: MutationClient,
  tournamentIds: number[],
  updatedAt: TimestampValue
): Promise<{ matchIds: number[]; matchCount: number }> {
  if (tournamentIds.length === 0) {
    return { matchIds: [], matchCount: 0 };
  }

  const updatedMatches = await db
    .update(schema.matches)
    .set({
      verificationStatus: VerificationStatus.Verified,
      rejectionReason: 0,
      warningFlags: MatchWarningFlags.None,
      updated: updatedAt,
    })
    .where(
      and(
        inArray(schema.matches.tournamentId, tournamentIds),
        ne(schema.matches.verificationStatus, VerificationStatus.Verified),
        ne(schema.matches.verificationStatus, VerificationStatus.Rejected)
      )
    )
    .returning({ id: schema.matches.id });

  const matchIds = updatedMatches.map((match) => match.id);

  return { matchIds, matchCount: updatedMatches.length };
}

/**
 * Cascade verification from a game to its scores.
 * Updates scores that are not already Verified or Rejected.
 */
export async function cascadeGameVerification(
  db: MutationClient,
  gameIdsInput: readonly number[],
  options?: CascadeOptions
): Promise<VerificationCascadeResult> {
  const gameIds = normalizeIds(gameIdsInput);

  if (gameIds.length === 0) {
    return { matchCount: 0, gameCount: 0, scoreCount: 0 };
  }

  const updatedAt = resolveTimestamp(options?.updatedAt);
  const scoreCount = await cascadeScoresVerification(db, gameIds, updatedAt);

  return {
    matchCount: 0,
    gameCount: 0,
    scoreCount,
  };
}

/**
 * Cascade verification from a match to its games and scores.
 * Updates games and scores that are not already Verified or Rejected.
 */
export async function cascadeMatchVerification(
  db: MutationClient,
  matchIdsInput: readonly number[],
  options?: CascadeOptions
): Promise<VerificationCascadeResult> {
  const matchIds = normalizeIds(matchIdsInput);

  if (matchIds.length === 0) {
    return { matchCount: 0, gameCount: 0, scoreCount: 0 };
  }

  const updatedAt = resolveTimestamp(options?.updatedAt);

  const { gameIds, gameCount } = await cascadeGamesVerification(
    db,
    matchIds,
    updatedAt
  );
  const scoreCount = await cascadeScoresVerification(db, gameIds, updatedAt);

  return {
    matchCount: 0,
    gameCount,
    scoreCount,
  };
}

/**
 * Cascade verification from a tournament to its matches, games, and scores.
 * Updates matches, games, and scores that are not already Verified or Rejected.
 */
export async function cascadeTournamentVerification(
  db: MutationClient,
  tournamentIdsInput: readonly number[],
  options?: CascadeOptions
): Promise<VerificationCascadeResult> {
  const tournamentIds = normalizeIds(tournamentIdsInput);

  if (tournamentIds.length === 0) {
    return { matchCount: 0, gameCount: 0, scoreCount: 0 };
  }

  const updatedAt = resolveTimestamp(options?.updatedAt);

  const { matchIds, matchCount } = await cascadeMatchesVerification(
    db,
    tournamentIds,
    updatedAt
  );
  const { gameIds, gameCount } = await cascadeGamesVerification(
    db,
    matchIds,
    updatedAt
  );
  const scoreCount = await cascadeScoresVerification(db, gameIds, updatedAt);

  return {
    matchCount,
    gameCount,
    scoreCount,
  };
}
