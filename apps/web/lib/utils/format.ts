/**
 * Formats accuracy (stored as 0.0-1.0) as a percentage string (0-100%).
 * @param accuracy - The accuracy value from 0.0 to 1.0
 * @param decimals - Number of decimal places to display (default: 2)
 * @returns Formatted percentage string (e.g., "95.50%")
 */
export function formatAccuracy(accuracy: number, decimals: number = 2): string {
  return `${(accuracy * 100).toFixed(decimals)}%`;
}
