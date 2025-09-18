import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerDashboard';

export type ChartDataPoint = {
  formattedAxisDate: string;
  timestampValue: number;
} & PlayerRatingAdjustment;

/**
 * Sorts rating adjustments by timestamp in descending order
 * @param data - The data to sort
 * @param descending - Whether to sort in descending order
 * @returns The sorted data
 */
export function sortData(
  data: PlayerRatingAdjustment[],
  descending: boolean
): PlayerRatingAdjustment[] {
  return [...data].sort((a, b) =>
    descending
      ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
