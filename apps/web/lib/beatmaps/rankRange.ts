/**
 * Tournament rank-range buckets, derived from `tournaments.rankRangeLowerBound`.
 *
 * Single source of truth shared by the beatmap stats procedure (server-side
 * aggregation) and the beatmap cards (client-side display). Pure TypeScript —
 * no server-only imports — so both sides can import it directly.
 */

export const RANK_RANGE_BUCKET_KEYS = [
  'open',
  'lt1k',
  '1kPlus',
  '10kPlus',
  '100kPlus',
] as const;

export type RankRangeBucketKey = (typeof RANK_RANGE_BUCKET_KEYS)[number];

export interface RankRangeBucketDef {
  key: RankRangeBucketKey;
  label: string;
  /** Inclusive lower bound on `tournaments.rankRangeLowerBound`. */
  minBound: number;
  /** Inclusive upper bound; null = open-ended. */
  maxBound: number | null;
  /**
   * Theme token for every rank-range surface (the scatter and its legend).
   * The buckets are ordinal, so the ramp walks hue and lightness together.
   */
  color: string;
  /**
   * Symbol and dash carry the bucket redundantly with colour: an ordinal
   * five-step hue ramp cannot be made CVD-safe, so the two colours that confuse
   * worst get the two most different silhouettes and dash patterns.
   */
  symbol: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';
  /** SVG stroke-dasharray for this range's trendline at stroke-width 2. */
  dash: string;
  /** Only the dotted pattern needs round caps to read as dots. */
  dashLinecap: 'butt' | 'round';
}

/** Display order for every rank-range surface. */
export const RANK_RANGE_BUCKETS: readonly RankRangeBucketDef[] = [
  {
    key: 'open',
    label: 'Open',
    minBound: 1,
    maxBound: 1,
    color: 'var(--rank-range-open)',
    symbol: 'circle',
    dash: 'none',
    dashLinecap: 'butt',
  },
  {
    key: 'lt1k',
    label: '<1k',
    minBound: 2,
    maxBound: 999,
    color: 'var(--rank-range-lt1k)',
    symbol: 'diamond',
    dash: '4 4',
    dashLinecap: 'butt',
  },
  {
    key: '1kPlus',
    label: '1k+',
    minBound: 1_000,
    maxBound: 9_999,
    color: 'var(--rank-range-1k)',
    symbol: 'triangle',
    dash: '0.1 6',
    dashLinecap: 'round',
  },
  {
    key: '10kPlus',
    label: '10k+',
    minBound: 10_000,
    maxBound: 99_999,
    color: 'var(--rank-range-10k)',
    symbol: 'square',
    dash: '7 3 2 3',
    dashLinecap: 'butt',
  },
  {
    key: '100kPlus',
    label: '100k+',
    minBound: 100_000,
    maxBound: null,
    color: 'var(--rank-range-100k)',
    symbol: 'cross',
    dash: '11 5',
    dashLinecap: 'butt',
  },
];

/**
 * Bucket a raw `rankRangeLowerBound`. Returns null for non-finite values or
 * anything below 1 — the schema guarantees a positive integer, but malformed
 * data is skipped rather than silently misbucketed.
 */
export function getRankRangeBucketKey(
  rankRangeLowerBound: number
): RankRangeBucketKey | null {
  const bound = rankRangeLowerBound;

  if (!Number.isFinite(bound) || bound < 1) return null;

  if (bound === 1) return 'open';
  if (bound < 1_000) return 'lt1k';
  if (bound < 10_000) return '1kPlus';
  if (bound < 100_000) return '10kPlus';
  return '100kPlus';
}

export interface RankRangeBucketCount {
  key: RankRangeBucketKey;
  label: string;
  count: number;
}

/**
 * Buckets tournaments by `rankRangeLowerBound` into the fixed brackets.
 * Always returns all five buckets in display order, zero counts included.
 */
export function bucketRankRanges(
  pools: ReadonlyArray<{ rankRangeLowerBound: number }>
): RankRangeBucketCount[] {
  const buckets: RankRangeBucketCount[] = RANK_RANGE_BUCKETS.map(
    (definition) => ({
      key: definition.key,
      label: definition.label,
      count: 0,
    })
  );

  for (const pool of pools) {
    const key = getRankRangeBucketKey(pool.rankRangeLowerBound);
    if (key == null) continue;

    const bucket = buckets.find((entry) => entry.key === key)!;
    bucket.count += 1;
  }

  return buckets;
}

/** Renders a raw `tournaments.rankRangeLowerBound`: `Open`, or `10,000+`. */
export function formatRankRangeBound(rankRangeLowerBound: number): string {
  if (rankRangeLowerBound === 1) return 'Open';

  return `${rankRangeLowerBound.toLocaleString()}+`;
}
