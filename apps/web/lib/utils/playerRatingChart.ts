import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';

export type ChartDataPoint = {
  formattedAxisDate: string;
  timestampValue: number;
} & PlayerRatingAdjustment;

/** Sorts rating adjustments by timestamp. */
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
