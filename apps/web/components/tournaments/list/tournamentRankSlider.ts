export const RANK_RANGE_MIN = 1;
export const RANK_RANGE_MAX = 1_000_000;
export const RANK_SLIDER_MIN = 0;
export const RANK_SLIDER_MAX = 100;
export const RANK_SLIDER_STEP = 0.0001;

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
