import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';

export const SIMILARITY_THRESHOLD = 0.3;

export const normalizeSearchTerm = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const buildPrefixQuery = (tokens: readonly string[]) =>
  tokens.length === 0
    ? null
    : tokens
        .map((token) => {
          const safeToken = token.replace(/'/g, "''");
          return `'${safeToken}':*`;
        })
        .join(' & ');

export type ParsedSearchTerm = {
  normalizedTerm: string;
  tokens: string[];
  tsQuery: SQL;
  prefixTsQuery: SQL | null;
  primaryToken: string;
  hasDistinctPrimaryToken: boolean;
};

export function parseSearchTerm(term: string): ParsedSearchTerm | null {
  const trimmed = term.trim();
  if (!trimmed) return null;

  const normalizedTerm = normalizeSearchTerm(trimmed);
  if (!normalizedTerm) return null;

  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const prefixQueryText = buildPrefixQuery(tokens);
  const tsQuery = sql`plainto_tsquery('simple', ${normalizedTerm})`;
  const prefixTsQuery = prefixQueryText
    ? sql`to_tsquery('simple', ${prefixQueryText})`
    : null;

  const primaryToken = tokens[0] ?? normalizedTerm;
  const hasDistinctPrimaryToken = primaryToken !== normalizedTerm;

  return {
    normalizedTerm,
    tokens,
    tsQuery,
    prefixTsQuery,
    primaryToken,
    hasDistinctPrimaryToken,
  };
}

export function buildSimilarity(
  column: AnyColumn | SQL,
  normalizedTerm: string,
  primaryToken: string,
  hasDistinctPrimaryToken: boolean
): SQL {
  return hasDistinctPrimaryToken
    ? sql`greatest(similarity(${column}, ${normalizedTerm}), similarity(${column}, ${primaryToken}))`
    : sql`similarity(${column}, ${normalizedTerm})`;
}

export type BeatmapSearchExpressions = {
  condition: SQL;
  rank: SQL<number>;
};

export function buildBeatmapSearchExpressions(
  searchTerm: string
): BeatmapSearchExpressions | null {
  const parsed = parseSearchTerm(searchTerm);
  if (!parsed) return null;

  const {
    normalizedTerm,
    tsQuery,
    prefixTsQuery,
    primaryToken,
    hasDistinctPrimaryToken,
  } = parsed;

  const beatmapVector = sql`${schema.beatmaps.searchVector} || ${schema.beatmapsets.searchVector}`;

  const beatmapDiffSimilarity = buildSimilarity(
    schema.beatmaps.diffName,
    normalizedTerm,
    primaryToken,
    hasDistinctPrimaryToken
  );
  const beatmapArtistSimilarity = buildSimilarity(
    sql`coalesce(${schema.beatmapsets.artist}, '')`,
    normalizedTerm,
    primaryToken,
    hasDistinctPrimaryToken
  );
  const beatmapTitleSimilarity = buildSimilarity(
    sql`coalesce(${schema.beatmapsets.title}, '')`,
    normalizedTerm,
    primaryToken,
    hasDistinctPrimaryToken
  );
  const beatmapSimilarity = sql`greatest(${beatmapDiffSimilarity}, ${beatmapArtistSimilarity}, ${beatmapTitleSimilarity})`;

  const condition = prefixTsQuery
    ? sql`(${beatmapVector} @@ ${tsQuery} OR ${beatmapVector} @@ ${prefixTsQuery} OR ${beatmapSimilarity} >= ${SIMILARITY_THRESHOLD})`
    : sql`(${beatmapVector} @@ ${tsQuery} OR ${beatmapSimilarity} >= ${SIMILARITY_THRESHOLD})`;

  const beatmapRank = prefixTsQuery
    ? sql<number>`greatest(ts_rank_cd(${beatmapVector}, ${tsQuery}), ts_rank_cd(${beatmapVector}, ${prefixTsQuery}), ${beatmapSimilarity})`
    : sql<number>`greatest(ts_rank_cd(${beatmapVector}, ${tsQuery}), ${beatmapSimilarity})`;

  const popularityScore = sql`(
    sqrt(COALESCE(${schema.beatmapStats.verifiedGameCount}, 0) + 1) +
    sqrt(COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0) + 1) * 2
  )`;

  const rank = sql<number>`(
    (${beatmapRank}) * 0.5 +
    (${popularityScore} / 20.0) * 0.5
  )`;

  return { condition, rank };
}
