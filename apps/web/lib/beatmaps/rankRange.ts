// Tournament rank-range buckets, shared by the stats procedure and the cards.
// Keep free of server-only imports.

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
  /** Theme token for every rank-range surface. */
  color: string;
  /** Carries the bucket redundantly with colour, which cannot be made CVD-safe. */
  symbol: 'circle' | 'square' | 'triangle' | 'diamond' | 'cross';
  /** SVG stroke-dasharray for this range's trendline at stroke-width 2. */
  dash: string;
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

/** Buckets a raw `rankRangeLowerBound`; null for non-finite values or anything below 1. */
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

/** Buckets tournaments into all five brackets, in display order, zero counts included. */
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
