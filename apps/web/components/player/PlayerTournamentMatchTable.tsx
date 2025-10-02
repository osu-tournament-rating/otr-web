'use client';

import { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerDashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import Link from 'next/link';
import RatingDelta from '@/components/rating/RatingDelta';

const RATING_PRECISION = {
  DISPLAY: 0,
} as const;

interface PlayerTournamentMatchTableProps {
  adjustments: PlayerRatingAdjustment[];
}

export default function PlayerTournamentMatchTable({
  adjustments,
}: PlayerTournamentMatchTableProps) {
  const sortedAdjustments = [...adjustments].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-muted/50">Date</TableHead>
              <TableHead className="bg-muted/50">Match</TableHead>
              <TableHead className="bg-muted/50 text-center">Before</TableHead>
              <TableHead className="bg-muted/50 text-center">After</TableHead>
              <TableHead className="bg-muted/50 text-center">Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAdjustments.length > 0 ? (
              sortedAdjustments.map((adjustment, index) => (
                <TableRow
                  key={`${adjustment.match?.id}-${index}`}
                  className="hover:bg-muted/30 transition-colors duration-200"
                >
                  <TableCell>
                    {format(new Date(adjustment.timestamp), 'yyyy-MM-dd')}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {adjustment.match ? (
                      <Link
                        href={`/matches/${adjustment.match.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {adjustment.match.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">
                        Match not found
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-2 text-center text-xs sm:text-sm">
                    {adjustment.ratingBefore.toFixed(RATING_PRECISION.DISPLAY)}
                  </TableCell>
                  <TableCell className="py-2 text-center text-xs font-medium sm:text-sm">
                    {adjustment.ratingAfter.toFixed(RATING_PRECISION.DISPLAY)}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <RatingDelta delta={adjustment.ratingDelta} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  No matches found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
