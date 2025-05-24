import { RatingAdjustmentDTO } from '@osu-tournament-rating/otr-api-client';

export type ChartDataPoint = {
  formattedAxisDate: string;
} & RatingAdjustmentDTO;

/**
 * Sorts rating adjustments by timestamp in descending order
 * @param data - The data to sort
 * @param descending - Whether to sort in descending order
 * @returns The sorted data
 */
export function sortData(
  data: RatingAdjustmentDTO[],
  descending: boolean
): RatingAdjustmentDTO[] {
  return [...data].sort((a, b) =>
    descending
      ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
