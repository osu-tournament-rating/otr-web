'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import { TournamentListItem } from '@/lib/orpc/schema/tournament';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { Target, Users } from 'lucide-react';

interface PlayerBeatmapTournamentTableProps {
  tournaments: TournamentListItem[];
}

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

export default function PlayerBeatmapTournamentTable({
  tournaments,
}: PlayerBeatmapTournamentTableProps) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-muted/50 w-[40px]" />
              <TableHead className="bg-muted/50">Date Range</TableHead>
              <TableHead className="bg-muted/50">Tournament</TableHead>
              <TableHead className="bg-muted/50">Rank Range</TableHead>
              <TableHead className="bg-muted/50">Team Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournaments.length > 0 ? (
              tournaments.map((tournament) => {
                const startDate = tournament.startTime
                  ? new Date(tournament.startTime)
                  : null;
                const endDate = tournament.endTime
                  ? new Date(tournament.endTime)
                  : null;

                return (
                  <TableRow
                    key={tournament.id}
                    className="hover:bg-muted/30 transition-colors duration-200"
                  >
                    <TableCell className="w-[40px]">
                      <VerificationBadge
                        verificationStatus={tournament.verificationStatus}
                        rejectionReason={tournament.rejectionReason}
                        entityType="tournament"
                        size="small"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {startDate && endDate && (
                        <span className="whitespace-nowrap">
                          {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tournaments/${tournament.id}`}
                        className="hover:underline"
                      >
                        {tournament.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-4 w-4" />
                        {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground w-[80px] whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>
                          {tournament.lobbySize}v{tournament.lobbySize}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground h-24 text-center"
                >
                  No tournament data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
