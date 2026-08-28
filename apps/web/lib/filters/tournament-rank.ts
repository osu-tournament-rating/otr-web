import { SLIDER_MAX, SLIDER_MIN, type NumericScale } from './scale';

export const RANK_RANGE_MIN = 1;
export const RANK_RANGE_MAX = 1_000_000;
export const RANK_SLIDER_MIN = SLIDER_MIN;
export const RANK_SLIDER_MAX = SLIDER_MAX;

const rankTiers = [
  { start: 1, end: 1_000, step: 1 },
  { start: 1_100, end: 5_000, step: 100 },
  { start: 5_500, end: 10_000, step: 500 },
  { start: 11_000, end: RANK_RANGE_MAX, step: 1_000 },
] as const;

const rankSliderValues = rankTiers.flatMap(({ start, end, step }) =>
  Array.from(
    { length: Math.floor((end - start) / step) + 1 },
    (_, index) => start + index * step
  )
);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function lowerBound(target: number): number {
  let lower = 0;
  let upper = rankSliderValues.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (rankSliderValues[middle] < target) lower = middle + 1;
    else upper = middle;
  }

  return lower;
}

function upperBound(target: number): number {
  let lower = 0;
  let upper = rankSliderValues.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (rankSliderValues[middle] <= target) lower = middle + 1;
    else upper = middle;
  }

  return lower;
}

export function snapRankToSliderStop(rank: number): number {
  const normalizedRank = Number.isFinite(rank)
    ? Math.round(rank)
    : RANK_RANGE_MIN;
  const target = clamp(normalizedRank, RANK_RANGE_MIN, RANK_RANGE_MAX);
  const upperIndex = clamp(lowerBound(target), 0, rankSliderValues.length - 1);
  const lowerIndex = clamp(upperIndex - 1, 0, rankSliderValues.length - 1);
  const lowerDistance = target - rankSliderValues[lowerIndex];
  const upperDistance = rankSliderValues[upperIndex] - target;

  return lowerDistance < upperDistance
    ? rankSliderValues[lowerIndex]
    : rankSliderValues[upperIndex];
}

export function moveRankBySliderStops(rank: number, offset: number): number {
  if (offset === 0) return snapRankToSliderStop(rank);

  const targetIndex =
    offset > 0 ? upperBound(rank) + offset - 1 : lowerBound(rank) + offset;

  return rankSliderValues[clamp(targetIndex, 0, rankSliderValues.length - 1)];
}

/** Logarithmic, not proportional to stop index, so `tieredScale` cannot express it. */
export function rankToSliderPosition(rank: number): number {
  const normalizedRank = Number.isFinite(rank) ? rank : RANK_RANGE_MIN;
  const value = clamp(normalizedRank, RANK_RANGE_MIN, RANK_RANGE_MAX);

  if (value <= RANK_RANGE_MIN) return RANK_SLIDER_MIN;
  if (value >= RANK_RANGE_MAX) return RANK_SLIDER_MAX;

  return (
    (Math.log(value / RANK_RANGE_MIN) /
      Math.log(RANK_RANGE_MAX / RANK_RANGE_MIN)) *
    RANK_SLIDER_MAX
  );
}

export function sliderPositionToRank(position: number): number {
  const normalizedPosition = Number.isFinite(position)
    ? position
    : RANK_SLIDER_MIN;
  const value = clamp(normalizedPosition, RANK_SLIDER_MIN, RANK_SLIDER_MAX);
  const rank = Math.round(
    RANK_RANGE_MIN *
      Math.pow(RANK_RANGE_MAX / RANK_RANGE_MIN, value / RANK_SLIDER_MAX)
  );

  return snapRankToSliderStop(rank);
}

export const tournamentRankScale: NumericScale = {
  min: RANK_RANGE_MIN,
  max: RANK_RANGE_MAX,
  snap: snapRankToSliderStop,
  toPosition: rankToSliderPosition,
  fromPosition: sliderPositionToRank,
  step: moveRankBySliderStops,
};

/** The slider ceiling means "no upper limit", so it is not sent as a bound. */
export function toRankRangeFilter({
  min,
  max,
}: {
  min?: number;
  max?: number;
}) {
  return {
    minRankRange: min,
    maxRankRange: max !== undefined && max < RANK_RANGE_MAX ? max : undefined,
  };
}

export function hasRankRangeFilter(filter: {
  minRankRange?: number;
  maxRankRange?: number;
}): boolean {
  return (
    (filter.minRankRange !== undefined &&
      filter.minRankRange !== RANK_RANGE_MIN) ||
    (filter.maxRankRange !== undefined && filter.maxRankRange < RANK_RANGE_MAX)
  );
}
