/** Stored accuracy (0.0-1.0) as a percentage string, e.g. `95.50%`. */
export function formatAccuracy(accuracy: number, decimals: number = 2): string {
  return `${(accuracy * 100).toFixed(decimals)}%`;
}
