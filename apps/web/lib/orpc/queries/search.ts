import { desc, eq, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { alias, QueryBuilder } from 'drizzle-orm/pg-core';
import * as schema from '@otr/core/db/schema';
import { searchableText } from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { VerificationStatus } from '@otr/core/osu';

// pg_trgm's own default, so `%>` and this recheck agree without the session GUC.
export const WORD_SIMILARITY_THRESHOLD = 0.6;

// Below this, pg_trgm pads the term and scores 1.0 against any single-letter word.
export const MIN_TRIGRAM_TERM_LENGTH = 3;

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

// A one or two character prefix carries no selectivity, so only the token still
// being typed stays a prefix.
export const buildPrefixQuery = (tokens: readonly string[]) =>
  tokens.length === 0
    ? null
    : tokens
        .map((token, index) => {
          const safeToken = token.replace(/'/g, "''");
          const isBeingTyped = index === tokens.length - 1;
          return isBeingTyped || token.length >= MIN_TRIGRAM_TERM_LENGTH
            ? `'${safeToken}':*`
            : `'${safeToken}'`;
        })
        .join(' & ');

const buildAnyTokenQuery = (tokens: readonly string[]) =>
  tokens.length < 2
    ? null
    : tokens.map((token) => `'${token.replace(/'/g, "''")}':*`).join(' | ');

export type ParsedSearchTerm = {
  normalizedTerm: string;
  tokens: string[];
  tsQuery: SQL;
  prefixTsQuery: SQL | null;
  anyTokenTsQuery: SQL | null;
  /** Tokens long enough to carry trigrams, rejoined. */
  fuzzyTerm: string | null;
  fuzzyTokens: string[];
  primaryFuzzyToken: string | null;
  shortTokens: string[];
};

export function parseSearchTerm(term: string): ParsedSearchTerm | null {
  const trimmed = term.trim();
  if (!trimmed) return null;

  const normalizedTerm = normalizeSearchTerm(trimmed);
  if (!normalizedTerm) return null;

  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const prefixQueryText = buildPrefixQuery(tokens);
  const anyTokenQueryText = buildAnyTokenQuery(tokens);
  const tsQuery = sql`plainto_tsquery('simple', ${normalizedTerm})`;
  const prefixTsQuery = prefixQueryText
    ? sql`to_tsquery('simple', ${prefixQueryText})`
    : null;
  const anyTokenTsQuery = anyTokenQueryText
    ? sql`to_tsquery('simple', ${anyTokenQueryText})`
    : null;

  const fuzzyTokens = tokens.filter(
    (token) => token.length >= MIN_TRIGRAM_TERM_LENGTH
  );
  const fuzzyTerm = fuzzyTokens.length > 0 ? fuzzyTokens.join(' ') : null;
  const primaryFuzzyToken =
    fuzzyTokens.length > 1 ? (fuzzyTokens[0] ?? null) : null;
  const shortTokens =
    tokens.length > 1
      ? tokens.filter((token) => token.length < MIN_TRIGRAM_TERM_LENGTH)
      : [];

  return {
    normalizedTerm,
    tokens,
    tsQuery,
    prefixTsQuery,
    anyTokenTsQuery,
    fuzzyTerm,
    fuzzyTokens,
    primaryFuzzyToken,
    shortTokens,
  };
}

export function buildSimilarity(
  column: AnyColumn | SQL,
  parsed: ParsedSearchTerm
): SQL {
  const term = parsed.fuzzyTerm ?? parsed.normalizedTerm;
  const primary = parsed.primaryFuzzyToken;

  return primary
    ? sql`greatest(similarity(${column}, ${term}), similarity(${column}, ${primary}))`
    : sql`similarity(${column}, ${term})`;
}

/** Nominates typo-tolerant candidates; takes a bare column, since `%>` needs an index. */
export function buildTrigramMatch(
  column: AnyColumn,
  parsed: ParsedSearchTerm
): SQL {
  const { fuzzyTerm, primaryFuzzyToken } = parsed;
  if (!fuzzyTerm) return sql`false`;

  const matches = (term: string) =>
    sql`(${column} %> ${term} AND word_similarity(${term}, ${column}) >= ${WORD_SIMILARITY_THRESHOLD})`;

  return primaryFuzzyToken
    ? sql`(${matches(fuzzyTerm)} OR ${matches(primaryFuzzyToken)})`
    : matches(fuzzyTerm);
}

/** The precision half of trigram matching, ANDed onto {@link buildTrigramMatch}. */
export function buildTrigramPrecision(
  columns: readonly (AnyColumn | SQL)[],
  parsed: ParsedSearchTerm
): SQL {
  const { fuzzyTerm, fuzzyTokens, shortTokens } = parsed;
  if (!fuzzyTerm) return sql`false`;

  const inAnyColumn = (build: (column: SQL) => SQL) =>
    sql`(${sql.join(
      columns.map((column) => build(sql`coalesce(${column}, '')`)),
      sql` OR `
    )})`;

  const similar = (term: string) =>
    inAnyColumn(
      (column) =>
        sql`word_similarity(${term}, ${column}) >= ${WORD_SIMILARITY_THRESHOLD}`
    );

  const fuzzy =
    fuzzyTokens.length > 1
      ? sql`(${similar(fuzzyTerm)} OR ${sql.join(
          fuzzyTokens.map(similar),
          sql` AND `
        )})`
      : similar(fuzzyTerm);

  if (shortTokens.length === 0) return fuzzy;

  // Tokens are alphanumeric by construction, so they need no regex escaping.
  const wordPresence = shortTokens.map((token) =>
    inAnyColumn((column) => sql`${column} ~* ${`\\m${token}\\M`}`)
  );

  return sql`(${fuzzy} AND ${sql.join(wordPresence, sql` AND `)})`;
}

export type SearchExpressions = {
  condition: SQL;
  rank: SQL<number>;
};

export type PlayerSearchExpressions = SearchExpressions & {
  currentUsernameMatched: SQL<boolean>;
  /** The former username the query hit, or null when the current username did. */
  matchedPreviousUsername: SQL<string | null>;
};

/** The site-wide player criteria, shared with the admin player lookup. */
export function buildPlayerSearchExpressions(
  parsed: ParsedSearchTerm
): PlayerSearchExpressions {
  const { tsQuery, prefixTsQuery, anyTokenTsQuery } = parsed;
  const vector = schema.players.searchVector;
  const similarity = buildSimilarity(schema.players.username, parsed);
  // `%>` nominates candidates from the index; the precision half filters them
  const trigram = sql`(${buildTrigramMatch(schema.players.username, parsed)} AND ${buildTrigramPrecision(
    [schema.players.username],
    parsed
  )})`;

  const condition = prefixTsQuery
    ? sql`(${vector} @@ ${tsQuery} OR ${vector} @@ ${prefixTsQuery} OR ${trigram})`
    : sql`(${vector} @@ ${tsQuery} OR ${trigram})`;
  const rank = prefixTsQuery
    ? sql<number>`greatest(ts_rank_cd(${vector}, ${tsQuery}), ts_rank_cd(${vector}, ${prefixTsQuery}), ${similarity})`
    : sql<number>`greatest(ts_rank_cd(${vector}, ${tsQuery}), ${similarity})`;

  const matchesTerm = (value: SQL) => {
    const valueVector = sql`to_tsvector('simple', ${searchableText(value)})`;
    return prefixTsQuery
      ? sql`(${valueVector} @@ ${tsQuery} OR ${valueVector} @@ ${prefixTsQuery})`
      : sql`${valueVector} @@ ${tsQuery}`;
  };

  const currentUsernameMatched = sql<boolean>`(${matchesTerm(sql`${schema.players.username}`)} OR ${trigram})`;

  const previousUsernames = sql`unnest(${schema.players.previousUsernames}) with ordinality as entry(previous_username, ordinality)`;
  const closestPreviousUsername = sql`(select previous_username from ${previousUsernames} where ${matchesTerm(sql`previous_username`)} order by length(previous_username), ordinality limit 1)`;
  const contributingPreviousUsernames = anyTokenTsQuery
    ? sql`(select string_agg(previous_username, ', ' order by ordinality) from ${previousUsernames} where to_tsvector('simple', ${searchableText(sql`previous_username`)}) @@ ${anyTokenTsQuery})`
    : null;
  const disclosedPreviousUsername = contributingPreviousUsernames
    ? sql`coalesce(${closestPreviousUsername}, ${contributingPreviousUsernames})`
    : closestPreviousUsername;

  return {
    condition,
    rank,
    currentUsernameMatched,
    matchedPreviousUsername: sql<
      string | null
    >`case when ${currentUsernameMatched} then null else ${disclosedPreviousUsername} end`,
  };
}

type CandidateBranch = { getSQL: () => SQL };

// Must stay `id = any(array(union of index branches))` — any other shape makes
// Postgres scan the whole table.
function buildCandidateFilter(
  target: AnyColumn,
  branches: readonly CandidateBranch[]
): SQL {
  return sql`${target} = any(array(${sql.join(
    branches.map((branch) => sql`(${branch.getSQL()})`),
    sql` union all `
  )}))`;
}

function buildBeatmapCandidateIds(
  parsed: ParsedSearchTerm,
  osuIdCandidate: number | null
): SQL {
  const { tsQuery, prefixTsQuery, anyTokenTsQuery } = parsed;
  const beatmap = alias(schema.beatmaps, 'search_beatmap');
  const beatmapset = alias(schema.beatmapsets, 'search_beatmapset');
  const qb = new QueryBuilder();

  const fromBeatmaps = (where: SQL) =>
    qb.select({ id: beatmap.id }).from(beatmap).where(where);
  const fromBeatmapsets = (where: SQL) =>
    qb
      .select({ id: beatmap.id })
      .from(beatmap)
      .innerJoin(beatmapset, eq(beatmap.beatmapsetId, beatmapset.id))
      .where(where);
  // Left join: a beatmap whose set never landed still has a difficulty name.
  const fromBeatmapsWithSet = (where: SQL) =>
    qb
      .select({ id: beatmap.id })
      .from(beatmap)
      .leftJoin(beatmapset, eq(beatmap.beatmapsetId, beatmapset.id))
      .where(where);

  const matchesVector = (vector: SQL) =>
    prefixTsQuery
      ? sql`(${vector} @@ ${tsQuery} OR ${vector} @@ ${prefixTsQuery})`
      : sql`(${vector} @@ ${tsQuery})`;

  // Each branch keeps its `%>` operators on one table so an index can drive it.
  const precise = buildTrigramPrecision(
    [beatmap.diffName, beatmapset.title, beatmapset.artist],
    parsed
  );

  const branches = [
    fromBeatmaps(matchesVector(sql`${beatmap.searchVector}`)),
    fromBeatmapsets(matchesVector(sql`${beatmapset.searchVector}`)),
    fromBeatmapsWithSet(
      sql`(${buildTrigramMatch(beatmap.diffName, parsed)} AND ${precise})`
    ),
    fromBeatmapsets(
      sql`((${buildTrigramMatch(beatmapset.title, parsed)} OR ${buildTrigramMatch(beatmapset.artist, parsed)}) AND ${precise})`
    ),
  ];

  // Terms split across the two vectors: `hoshimiya hard` is a set title plus a
  // difficulty name.
  if (anyTokenTsQuery) {
    branches.push(
      fromBeatmapsets(
        sql`(${beatmap.searchVector} @@ ${anyTokenTsQuery} AND ${beatmapset.searchVector} @@ ${anyTokenTsQuery} AND ${matchesVector(sql`(${beatmap.searchVector} || ${beatmapset.searchVector})`)})`
      )
    );
  }

  if (osuIdCandidate !== null) {
    branches.push(fromBeatmaps(eq(beatmap.osuId, osuIdCandidate)));
  }

  return buildCandidateFilter(schema.beatmaps.id, branches);
}

/** A deleted beatmap comes back only once an admin fills its metadata in by hand. */
export const beatmapIsVisible = () =>
  sql`(${schema.beatmaps.dataFetchStatus} != ${DataFetchStatus.NotFound} OR ${schema.beatmaps.manualOverride})`;

export function buildBeatmapSearchExpressions(
  searchTerm: string
): SearchExpressions | null {
  const parsed = parseSearchTerm(searchTerm);
  const osuIdCandidate = parseOsuIdCandidate(searchTerm);

  if (!parsed) return null;

  const popularityScore = sql`(
    sqrt(COALESCE(${schema.beatmapStats.verifiedGameCount}, 0) + 1) +
    sqrt(COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0) + 1) * 2
  )`;

  const { tsQuery, prefixTsQuery } = parsed;

  // `tsvector || NULL` is NULL, and so is `NULL @@ query`.
  const beatmapVector = sql`${schema.beatmaps.searchVector} || coalesce(${schema.beatmapsets.searchVector}, ''::tsvector)`;

  const beatmapDiffSimilarity = buildSimilarity(
    schema.beatmaps.diffName,
    parsed
  );
  const beatmapArtistSimilarity = buildSimilarity(
    sql`coalesce(${schema.beatmaps.artistOverride}, ${schema.beatmapsets.artist}, '')`,
    parsed
  );
  const beatmapTitleSimilarity = buildSimilarity(
    sql`coalesce(${schema.beatmaps.titleOverride}, ${schema.beatmapsets.title}, '')`,
    parsed
  );
  const beatmapSimilarity = sql`greatest(${beatmapDiffSimilarity}, ${beatmapArtistSimilarity}, ${beatmapTitleSimilarity})`;

  const condition = sql`(${buildBeatmapCandidateIds(parsed, osuIdCandidate)} AND ${beatmapIsVisible()})`;

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

// Ranking reads the weighted `match_rank_vector`; only `search_vector` is indexed,
// so matching reads that instead.
const buildMatchRankVector = () =>
  sql`(${schema.matches.searchVector} || coalesce(${schema.tournaments.matchRankVector}, ''::tsvector))`;

function buildMatchCandidateIds(parsed: ParsedSearchTerm): SQL {
  const { tsQuery, prefixTsQuery, anyTokenTsQuery } = parsed;
  const match = alias(schema.matches, 'search_match');
  const tournament = alias(schema.tournaments, 'search_match_tournament');
  const qb = new QueryBuilder();

  const fromMatches = (where: SQL) =>
    qb.select({ id: match.id }).from(match).where(where);
  const fromTournaments = (where: SQL) =>
    qb
      .select({ id: match.id })
      .from(match)
      .innerJoin(tournament, eq(match.tournamentId, tournament.id))
      .where(where);

  const matchesVector = (vector: SQL) =>
    prefixTsQuery
      ? sql`(${vector} @@ ${tsQuery} OR ${vector} @@ ${prefixTsQuery})`
      : sql`(${vector} @@ ${tsQuery})`;

  const precise = buildTrigramPrecision(
    [match.name, tournament.name, tournament.abbreviation],
    parsed
  );

  const branches: CandidateBranch[] = [
    fromMatches(matchesVector(sql`${match.searchVector}`)),
    fromTournaments(matchesVector(sql`${tournament.searchVector}`)),
    fromTournaments(
      sql`(${buildTrigramMatch(match.name, parsed)} AND ${precise})`
    ),
    fromTournaments(
      sql`((${buildTrigramMatch(tournament.name, parsed)} OR ${buildTrigramMatch(tournament.abbreviation, parsed)}) AND ${precise})`
    ),
  ];

  // `CUSC2024 wwwww` is an abbreviation plus a match name.
  if (anyTokenTsQuery) {
    branches.push(
      fromTournaments(
        sql`(${match.searchVector} @@ ${anyTokenTsQuery} AND ${tournament.searchVector} @@ ${anyTokenTsQuery} AND ${matchesVector(sql`(${match.searchVector} || ${tournament.searchVector})`)})`
      )
    );
  }

  return buildCandidateFilter(schema.matches.id, branches);
}

export function buildMatchSearchExpressions(
  parsed: ParsedSearchTerm
): SearchExpressions {
  const matchVector = buildMatchRankVector();
  const matchSimilarity = sql`greatest(${buildSimilarity(schema.matches.name, parsed)}, ${buildSimilarity(sql`coalesce(${schema.tournaments.name}, '')`, parsed)}, ${buildSimilarity(sql`coalesce(${schema.tournaments.abbreviation}, '')`, parsed)})`;

  const rank = parsed.prefixTsQuery
    ? sql<number>`greatest(ts_rank_cd(${matchVector}, ${parsed.tsQuery}), ts_rank_cd(${matchVector}, ${parsed.prefixTsQuery}), ${matchSimilarity})`
    : sql<number>`greatest(ts_rank_cd(${matchVector}, ${parsed.tsQuery}), ${matchSimilarity})`;

  return { condition: buildMatchCandidateIds(parsed), rank };
}

const LIKE_ESCAPE_PATTERN = /[%_\\]/g;

export const escapeLikePattern = (value: string) =>
  value.replace(LIKE_ESCAPE_PATTERN, (match) => `\\${match}`);

/**
 * Order for the tournament list's relevance sort: verified tournaments first,
 * then how closely the abbreviation or name matches. The caller adds its tiebreak.
 */
export function buildTournamentRelevanceOrder(term: string): SQL[] {
  const exact = escapeLikePattern(term);
  const prefix = `${exact}%`;

  return [
    desc(
      sql`${schema.tournaments.verificationStatus} = ${VerificationStatus.Verified}`
    ),
    desc(sql<number>`CASE
      WHEN ${schema.tournaments.abbreviation} ILIKE ${exact} THEN 4
      WHEN ${schema.tournaments.name} ILIKE ${exact} THEN 3
      WHEN ${schema.tournaments.abbreviation} ILIKE ${prefix} THEN 2
      WHEN ${schema.tournaments.name} ILIKE ${prefix} THEN 1
      ELSE 0
    END`),
  ];
}
