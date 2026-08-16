import { eq, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { alias, QueryBuilder } from 'drizzle-orm/pg-core';
import * as schema from '@otr/core/db/schema';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';

/**
 * Threshold for `word_similarity`, which scores the term against the best
 * matching extent of the target rather than against the whole string. Plain
 * `similarity` is dominated by length, so a typo in a short term buried in a
 * long title scores far below any usable cut-off — `hoshimya` against
 * `w/WWW feat. Hoshimiya Toto` is 0.26 by `similarity` and 0.67 by
 * `word_similarity`. 0.6 is pg_trgm's own default, so the `%>` operator and
 * this recheck agree without depending on the session GUC.
 */
export const WORD_SIMILARITY_THRESHOLD = 0.6;

/**
 * Shortest term worth matching by trigram. A term under three characters has
 * no trigram of its own — pg_trgm pads it with spaces, so it scores 1.0
 * against any target containing that letter as a standalone word. Searching
 * `w/www` would otherwise pull in every tournament with a bare `w` in its
 * name via the `w` token.
 */
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

/**
 * A prefix term carries no selectivity when it is a character or two: `'w':* &
 * 'www':*` is satisfied by the single lexeme `wwwww`, which is why `w/www`
 * returned exactly what a bare `w` returned. A short token the user has already
 * finished — anything but the last one, which may still be mid-word — has to
 * match a whole lexeme instead.
 */
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

/**
 * The same terms ORed rather than ANDed. Every row satisfying the AND satisfies
 * this too, so it narrows a table to candidates without changing the result —
 * see {@link buildBeatmapCandidateIds}. Prefix form throughout, since `'w':*`
 * matches everything `'w'` does.
 */
const buildAnyTokenQuery = (tokens: readonly string[]) =>
  tokens.length < 2
    ? null
    : tokens.map((token) => `'${token.replace(/'/g, "''")}':*`).join(' | ');

export type ParsedSearchTerm = {
  normalizedTerm: string;
  tokens: string[];
  tsQuery: SQL;
  prefixTsQuery: SQL | null;
  /**
   * Matches any one of the terms. Null for a single-token search, where it
   * would say nothing the other queries do not.
   */
  anyTokenTsQuery: SQL | null;
  /**
   * The tokens long enough to carry trigrams, rejoined. Fuzzy matching runs
   * against this rather than the whole term: `w www` scores 0.8 against
   * `wwwww` because pg_trgm ignores the word boundary the user typed.
   */
  fuzzyTerm: string | null;
  /** The same tokens {@link fuzzyTerm} joins, kept apart. */
  fuzzyTokens: string[];
  /** First fuzzy token, when the term has more than one of them. */
  primaryFuzzyToken: string | null;
  /**
   * Tokens too short to fuzzy match, in a term that has other tokens. They are
   * still meaningful — they must appear as whole words — so trigram matching
   * carries them as a word-boundary requirement instead of dropping them.
   */
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
  // Ranking follows the same terms the trigram condition matches on, so a
  // one-letter token cannot lift every row that happens to contain that letter.
  const term = parsed.fuzzyTerm ?? parsed.normalizedTerm;
  const primary = parsed.primaryFuzzyToken;

  return primary
    ? sql`greatest(similarity(${column}, ${term}), similarity(${column}, ${primary}))`
    : sql`similarity(${column}, ${term})`;
}

/**
 * Typo-tolerant matching, the counterpart to {@link buildSimilarity} used for
 * ranking. `similarity(a, b) >= x` is an ordinary function call that no index
 * can serve, so a bare threshold comparison forces a sequential scan; pg_trgm's
 * `%>` operator is the form `gin_trgm_ops` understands. `%>` compares against
 * `pg_trgm.word_similarity_threshold`, so the explicit comparison stays as a
 * recheck to pin the effective threshold to ours.
 *
 * `column %> term` is word_similarity(term, column) — the column is the
 * document, the term is what we look for inside it.
 *
 * Pass the bare column, not a `coalesce` wrapper — an expression is not
 * indexable, and NULL is excluded either way.
 *
 * Deliberately loose: it nominates rows an index can find, and accepts a row on
 * the first fuzzy token alone. What the term's remaining tokens require is
 * {@link buildTrigramPrecision}, which every caller ANDs onto this.
 */
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

/**
 * The precision half of trigram matching, ANDed onto {@link buildTrigramMatch}.
 *
 * `buildTrigramMatch` accepts a row on the first fuzzy token alone, which is
 * what lets `hoshimya toto` reach a title holding only `Hoshimiya`. Left there,
 * every other token is ignored: `otr e2e no matching beatmap 7fd826c1` returns
 * `Otra vez no cumpli`, because `word_similarity('otr', …)` is 0.75. So the
 * loose form only nominates candidates, and a row keeps its place only if the
 * whole term matches one column, or every fuzzy token is found in some column.
 *
 * Cross-column by design: `bad buny te deseo` has its typo in the artist and
 * the rest in the title, and no single column accounts for all of it.
 *
 * Tokens too short to fuzzy match become word-boundary requirements instead of
 * being dropped. pg_trgm ignores the spaces in the term, so `w www` scores 0.8
 * against `wwwww`; requiring a standalone `w` keeps `w/WWW feat. Hoshimiya
 * Toto` and drops `wwwww`.
 *
 * Plain `word_similarity` rather than `%>` — this never narrows anything on its
 * own, so there is no index to keep it compatible with, and a `coalesce` around
 * an outer-joined column costs nothing here.
 */
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

  // A single fuzzy token makes the two legs the same predicate.
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

type CandidateBranch = { getSQL: () => SQL };

/**
 * Restricts a search to a set of ids collected by branches an index can answer.
 *
 * The matching conditions here are not indexable as written: they read a
 * tsvector concatenated across two tables and OR that with trigram tests on
 * either side, so Postgres has no choice but to join both tables in full and
 * filter every row — half a second on `beatmaps`, over a second on `matches`,
 * whatever the term. Restated as a union of single-table branches, each branch
 * is an index scan and the term's selectivity finally counts for something.
 *
 * `= any(array(...))` rather than `in (...)`: the array form is an InitPlan, so
 * the candidates are collected once and the outer query is driven by them. With
 * `in (...)` the planner is free to read it as a semi-join and, under an
 * `order by … limit`, will happily sort the whole table first and probe the
 * subquery per row — which measured slower than the join it replaced.
 */
function buildCandidateFilter(
  target: AnyColumn,
  branches: readonly CandidateBranch[]
): SQL {
  return sql`${target} = any(array(${sql.join(
    branches.map((branch) => sql`(${branch.getSQL()})`),
    sql` union all `
  )}))`;
}

/**
 * Beatmap candidates. Each branch mirrors one disjunct of the old condition, so
 * the union is exact rather than a superset — except the cross-table branch,
 * which cannot be indexed directly and is narrowed by
 * {@link ParsedSearchTerm.anyTokenTsQuery} on both sides before the
 * concatenated vector is rechecked.
 */
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
  // The trigram branches read the set's columns to judge a beatmap's own, so
  // they carry the join even when the indexed side is `beatmaps`. Left, not
  // inner: a beatmap whose set never landed still has a difficulty name.
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

  // Each branch keeps its `%>` operators on one table so an index can drive it;
  // the precision filter spans both and only removes rows afterwards.
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

  // A multi-token term can be satisfied by the two vectors together — `hoshimiya
  // hard` is a beatmapset title plus a difficulty name — which neither of the
  // first two branches sees. Both vectors then hold at least one of the terms.
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

export function buildBeatmapSearchExpressions(
  searchTerm: string
): SearchExpressions | null {
  const parsed = parseSearchTerm(searchTerm);
  const osuIdCandidate = parseOsuIdCandidate(searchTerm);

  // A digit-only term always parses, so `parsed` is non-null whenever an osu!
  // id candidate exists.
  if (!parsed) return null;

  const popularityScore = sql`(
    sqrt(COALESCE(${schema.beatmapStats.verifiedGameCount}, 0) + 1) +
    sqrt(COALESCE(${schema.beatmapStats.verifiedTournamentCount}, 0) + 1) * 2
  )`;

  const { tsQuery, prefixTsQuery } = parsed;

  // `tsvector || NULL` is NULL and `NULL @@ query` is NULL, so without the
  // coalesce every beatmap whose beatmapset join misses drops out of search
  // entirely, difficulty name included.
  const beatmapVector = sql`${schema.beatmaps.searchVector} || coalesce(${schema.beatmapsets.searchVector}, ''::tsvector)`;

  const beatmapDiffSimilarity = buildSimilarity(
    schema.beatmaps.diffName,
    parsed
  );
  const beatmapArtistSimilarity = buildSimilarity(
    sql`coalesce(${schema.beatmapsets.artist}, '')`,
    parsed
  );
  const beatmapTitleSimilarity = buildSimilarity(
    sql`coalesce(${schema.beatmapsets.title}, '')`,
    parsed
  );
  const beatmapSimilarity = sql`greatest(${beatmapDiffSimilarity}, ${beatmapArtistSimilarity}, ${beatmapTitleSimilarity})`;

  // Beatmaps osu! no longer serves carry no title, difficulty name or
  // difficulty values, so they are excluded here as well as in the beatmap
  // listing — the two paths otherwise return different sets.
  const isFetchable = sql`${schema.beatmaps.dataFetchStatus} != ${DataFetchStatus.NotFound}`;

  const condition = sql`(${buildBeatmapCandidateIds(parsed, osuIdCandidate)} AND ${isFetchable})`;

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

/**
 * A match reads as "tournament + match name", so ranking weights the
 * tournament's name and abbreviation below the match's own — that is what
 * `tournaments.match_rank_vector` stores. It used to be assembled per row from
 * `regexp_replace` and four `to_tsvector` calls, which cost seven eighths of a
 * broad match search: 40k matching rows all rebuilding the same 3k tournament
 * vectors.
 *
 * Matching uses `tournaments.search_vector` instead. The two carry the same
 * lexemes from the same two columns and differ only in weight, which `@@`
 * ignores for an unlabelled query, and only `search_vector` is indexed.
 */
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

  // A match reads as "tournament + match name", so precision is judged over
  // both. Every match has a tournament, so the inner join loses nothing.
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

  // `CUSC2024 wwwww` is a tournament abbreviation plus a match name: neither
  // vector holds every term, but each holds one.
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
