export function formatRankString(rank: number): string {
  if (rank === 1) {
    return 'Open rank';
  } else if (rank < 1000) {
    return rank.toString();
  } else if (rank >= 1000 && rank < 1000000) {
    const rounded = Math.round(rank / 100) * 100;
    const k = rounded / 1000;
    return `${k}k`;
  } else if (rank >= 1000000) {
    const rounded = Math.round(rank / 100000) * 100000;
    const m = rounded / 1000000;
    return `${m}m`;
  }
  return 'Unsupported rank';
}
