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
import VerificationBadge from '@/components/badges/VerificationBadge';
import { Calendar, Target, Users, Gamepad2, CirclePlus } from 'lucide-react';
import ModIconset from '../icons/ModIconset';
import { BeatmapTournamentListItem } from '@/lib/orpc/schema/playerBeatmaps';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import SimpleTooltip from '../simple-tooltip';
import { Mods } from '@otr/core/osu';

interface PlayerBeatmapTournamentTableProps {
  tournaments: BeatmapTournamentListItem[];
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
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 w-[40px]" />
                <TableHead className="bg-muted/50 text-left">
                  <Tooltip>
                    <TooltipTrigger>
                      <Calendar className="mx-auto h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>Date Range</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="bg-muted/50">Tournament</TableHead>
                <TableHead className="bg-muted/50 text-center">
                  <SimpleTooltip content="Rank Range">
                    <Target className="mx-auto h-4 w-4" />
                  </SimpleTooltip>
                </TableHead>
                <TableHead className="bg-muted/50 text-center">
                  <SimpleTooltip content="Team Size">
                    <Users className="mx-auto h-4 w-4" />
                  </SimpleTooltip>
                </TableHead>
                <TableHead className="bg-muted/50 text-center">
                  <SimpleTooltip content="Mod">
                    <CirclePlus className="mx-auto h-4 w-4" />
                  </SimpleTooltip>
                </TableHead>
                <TableHead className="bg-muted/50 text-center">
                  <SimpleTooltip content="Number of Games">
                    <Gamepad2 className="mx-auto h-4 w-4" />
                  </SimpleTooltip>
                </TableHead>
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
                      <TableCell className="w-[40px] py-2">
                        <VerificationBadge
                          verificationStatus={tournament.verificationStatus}
                          rejectionReason={tournament.rejectionReason}
                          entityType="tournament"
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2 text-sm">
                        {startDate && endDate && (
                          <span className="whitespace-nowrap">
                            {formatUTCDate(startDate)} -{' '}
                            {formatUTCDate(endDate)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <Link
                          href={`/tournaments/${tournament.id}`}
                          className="hover:underline"
                        >
                          {tournament.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2 text-sm">
                        <div className="text-center">
                          {formatRankRangeDisplay(
                            tournament.rankRangeLowerBound
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground w-[80px] whitespace-nowrap py-2 text-sm">
                        <div className="text-center">
                          {tournament.lobbySize}v{tournament.lobbySize}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2">
                        <div className="flex h-7 items-center justify-center">
                          {tournament.mostCommonMod === Mods.None ? (
                            <span>N/A</span>
                          ) : (
                            <ModIconset
                              mods={tournament.mostCommonMod ?? Mods.None}
                              className="flex h-full items-center"
                              iconClassName="h-7"
                              alwaysExpanded={true}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2 text-sm">
                        <div className="text-center">
                          {tournament.gamesPlayed ?? 0}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No tournament data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TooltipProvider>
      </div>
    </div>
  );
}
