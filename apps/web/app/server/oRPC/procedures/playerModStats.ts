import { and, eq, gte, lte, sql } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { Mods, Ruleset, ScoringType, VerificationStatus } from '@otr/core/osu';
import type { DatabaseClient } from '@/lib/db';
import { ModsEnumHelper } from '@/lib/enum-helpers';
import { NORMALIZED_SCORE_MODS_SQL } from './shared/scoreMods';

// Match getBeatmapModLabel, including flags such as mania keys with no visible text.
const labelParts = Object.values(Mods)
  .filter((flag): flag is Mods => typeof flag === 'number' && flag !== 0)
  .filter((flag) => ModsEnumHelper.metadata[flag]?.text)
  .map(
    (flag) =>
      sql`CASE WHEN (${NORMALIZED_SCORE_MODS_SQL} & ${sql.raw(String(flag))}) = ${sql.raw(String(flag))} THEN ${ModsEnumHelper.metadata[flag].text} ELSE '' END`
  );
const displayLabel = sql<string>`COALESCE(NULLIF(CONCAT(${sql.join(labelParts, sql`, `)}), ''), 'NM')`;

export async function getPlayerModPerformance(
  db: DatabaseClient,
  playerId: number,
  ruleset: Ruleset,
  bounds: { start?: string | null; end?: string | null }
) {
  const filters = [
    eq(schema.gameScores.playerId, playerId),
    eq(schema.gameScores.verificationStatus, VerificationStatus.Verified),
    eq(schema.games.verificationStatus, VerificationStatus.Verified),
    eq(schema.matches.verificationStatus, VerificationStatus.Verified),
    eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
    eq(schema.tournaments.ruleset, ruleset),
    eq(schema.games.scoringType, ScoringType.ScoreV2),
  ];
  if (bounds.start) filters.push(gte(schema.games.startTime, bounds.start));
  if (bounds.end) filters.push(lte(schema.games.startTime, bounds.end));
  const rows = await db
    .select({
      label: displayLabel.as('label'),
      count: sql<number>`COUNT(*)`,
      medianScore: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
    })
    .from(schema.gameScores)
    .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
    .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
    .innerJoin(
      schema.tournaments,
      eq(schema.tournaments.id, schema.matches.tournamentId)
    )
    .where(and(...filters))
    .groupBy(sql`"label"`)
    .orderBy(sql`"label"`);
  return rows.map((row) => ({
    label: row.label,
    count: Number(row.count),
    medianScore: Number(row.medianScore),
  }));
}
