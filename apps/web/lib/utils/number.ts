/** Formats a tournament's `rankRangeLowerBound`. */
export function formatRankRange(rankRange: number) {
  if (rankRange === 1) {
    return 'Open rank';
  }

  return rankRange.toLocaleString() + '+';
}
