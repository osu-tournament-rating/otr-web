/**
 * Formats a {@link TournamentDTO.rankRangeLowerBound | tournament rank range}
 * value into a string
 * @param rankRange Rank range
 * @returns String formatted rank range
 */
export function formatRankRange(rankRange: number) {
  if (rankRange === 1) {
    return 'Open rank';
  }

  return rankRange.toLocaleString() + '+';
}
