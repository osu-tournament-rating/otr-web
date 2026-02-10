import { sql, type AnyColumn, type SQL } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';

export const SIMILARITY_THRESHOLD = 0.3;

export function parseOsuIdCandidate(term: string): number | null {
  const trimmed = term.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  if (
    !Number.isFinite(parsed) ||
    parsed <= 0 ||
    parsed > Number.MAX_SAFE_INTEGER
  ) {
    return null;
  }
  return parsed;
}

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
  const osuIdCandidate = parseOsuIdCandidate(searchTerm);

  if (!parsed && osuIdCandidate === null) return null;

  const popularityScore = sql`(
    sqrt(COALESCE(${schema.beatmapStats.verifiedGameCount}, 0) + 1) +
    sqrt(COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0) + 1) * 2
  )`;

  if (!parsed && osuIdCandidate !== null) {
    const condition = sql`${schema.beatmaps.osuId} = ${osuIdCandidate}`;
    const rank = sql<number>`1000 + (${popularityScore} / 20.0) * 0.5`;
    return { condition, rank };
  }

  const {
    normalizedTerm,
    tsQuery,
    prefixTsQuery,
    primaryToken,
    hasDistinctPrimaryToken,
  } = parsed!;

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

  const textCondition = prefixTsQuery
    ? sql`(${beatmapVector} @@ ${tsQuery} OR ${beatmapVector} @@ ${prefixTsQuery})`
    : sql`(${beatmapVector} @@ ${tsQuery})`;

  const condition =
    osuIdCandidate !== null
      ? sql`(${schema.beatmaps.osuId} = ${osuIdCandidate} OR ${textCondition})`
      : textCondition;

  const beatmapRank = prefixTsQuery
    ? sql<number>`greatest(ts_rank_cd(${beatmapVector}, ${tsQuery}), ts_rank_cd(${beatmapVector}, ${prefixTsQuery}), ${beatmapSimilarity})`
    : sql<number>`greatest(ts_rank_cd(${beatmapVector}, ${tsQuery}), ${beatmapSimilarity})`;

  const osuIdBoost =
    osuIdCandidate !== null
      ? sql`CASE WHEN ${schema.beatmaps.osuId} = ${osuIdCandidate} THEN 1000 ELSE 0 END`
      : sql`0`;

  const rank = sql<number>`(
    ${osuIdBoost} +
    (${beatmapRank}) * 0.5 +
    (${popularityScore} / 20.0) * 0.5
  )`;

  return { condition, rank };
}
