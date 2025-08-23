import Link from 'next/link';
import {
  RatingAdjustmentDTO,
  RatingAdjustmentType,
} from '@osu-tournament-rating/otr-api-client';
import { RatingAdjustmentTypeEnumhelper } from '@/lib/enums';
import { formattedDate } from './PlayerRatingChartTooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { sortData } from '@/lib/utils/playerRatingChart';

interface PlayerRatingChartTableProps {
  data: RatingAdjustmentDTO[];
  activeTab: 'rating' | 'volatility';
}

function getAdjustmentTypeColor(
  type: RatingAdjustmentType,
  delta: number
): string {
  switch (type) {
    case RatingAdjustmentType.Decay:
      return 'bg-accent';
    case RatingAdjustmentType.Match:
      return delta > 0 ? 'bg-success' : 'bg-destructive';
    default:
      return 'bg-primary';
  }
}

export default function PlayerRatingChartTable({
  data,
  activeTab,
}: PlayerRatingChartTableProps) {
  return (
    <Table>
      <TableHeader className="bg-popover">
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">
            {activeTab === 'rating' ? 'Rating' : 'Volatility'}
          </TableHead>
          <TableHead className="text-right">Change</TableHead>
          <TableHead>Match</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="max-h-[300px]">
        {sortData(data, true).map((point, index) => (
          <TableRow key={index} className="hover:bg-muted">
            <TableCell>{formattedDate(point.timestamp)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${getAdjustmentTypeColor(
                    point.adjustmentType,
                    point.ratingDelta
                  )}`}
                />
                {
                  RatingAdjustmentTypeEnumhelper.getMetadata(
                    point.adjustmentType
                  ).text
                }
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">
              {activeTab === 'rating'
                ? point.ratingAfter.toFixed(0)
                : point.volatilityAfter.toFixed(2)}
            </TableCell>
            {activeTab === 'rating' ? (
              <TableCell
                className={`text-right font-medium ${
                  point.ratingDelta > 0
                    ? 'text-success'
                    : point.ratingDelta < 0
                      ? 'text-destructive'
                      : ''
                }`}
              >
                {point.ratingDelta > 0 ? '+' : ''}
                {point.ratingDelta.toFixed(2)}
              </TableCell>
            ) : (
              <TableCell
                className={`text-right font-medium ${
                  point.volatilityDelta < 0
                    ? 'text-success'
                    : point.volatilityDelta > 0
                      ? 'text-destructive'
                      : ''
                }`}
              >
                {point.volatilityDelta > 0 ? '+' : ''}
                {point.volatilityDelta.toFixed(2)}
              </TableCell>
            )}
            <TableCell className="max-w-[300px] truncate overflow-y-clip text-muted-foreground">
              {point.match?.id && point.match?.name ? (
                <Link
                  href={`/matches/${point.match.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {point.match.name}
                </Link>
              ) : (
                '-'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
