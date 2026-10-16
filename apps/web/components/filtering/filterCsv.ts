import type { FilteringResult } from '@/lib/orpc/schema/filtering';
import { downloadCSV } from '@/lib/utils/csv';

import { getFailureReasons } from './FailureReasonsBadges';

const CSV_HEADERS = [
  'osu! ID',
  'Username',
  'Player ID',
  'Status',
  'Rating',
  'Failure Reasons',
];

/** Saves a filter's results as a CSV file, one row per player, ratings unrounded. */
export function downloadFilterCsv(results: FilteringResult, filename: string) {
  const rows = results.filteringResults.map((player) => [
    player.osuId?.toString() ?? 'N/A',
    player.username ?? 'N/A',
    player.playerId?.toString() ?? 'N/A',
    player.isSuccess ? 'Passed' : 'Failed',
    player.currentRating != null ? player.currentRating.toString() : 'N/A',
    getFailureReasons(player.failureReason).join(', '),
  ]);

  downloadCSV(rows, CSV_HEADERS, filename);
}

/** Today's UTC day, `2025-06-30`, for the file name. */
export function csvDay(): string {
  return new Date().toISOString().slice(0, 10);
}
