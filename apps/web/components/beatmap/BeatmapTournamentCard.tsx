'use client';

import { RulesetEnumHelper } from '@/lib/enums';
import { formatRankRange } from '@/lib/utils/number';
import Link from 'next/link';
import VerificationBadge from '../badges/VerificationBadge';
import { LazerBadge } from '../badges/LazerBadge';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import RulesetIcon from '../icons/RulesetIcon';
import ModIconset from '../icons/ModIconset';
import TierIcon from '../icons/TierIcon';
import {
  Users,
  Target,
  Calendar,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatUTCDate } from '@/lib/utils/date';
import { orpc } from '@/lib/orpc/orpc';
import { getTierFromRating } from '@/lib/utils/tierData';
import type {
  BeatmapTournamentUsage,
  BeatmapTournamentMatch,
} from '@/lib/orpc/schema/beatmapStats';

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

interface BeatmapTournamentCardProps {
  tournament: BeatmapTournamentUsage;
  beatmapOsuId: number;
}

export default function BeatmapTournamentCard({
  tournament,
  beatmapOsuId,
}: BeatmapTournamentCardProps) {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [matches, setMatches] = useState<BeatmapTournamentMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDetailsVisible || matchesLoaded || isLoadingMatches) {
      return;
    }

    const loadMatches = async () => {
      setIsLoadingMatches(true);
      setMatchesError(null);

      try {
        const response = await orpc.beatmaps.tournamentMatches({
          beatmapId: beatmapOsuId,
          keyType: 'osu',
          tournamentId: tournament.tournament.id,
        });
        setMatches(response.matches);
        setMatchesLoaded(true);
      } catch (error) {
        console.error('Failed to load matches', error);
        setMatchesError('Failed to load matches');
      } finally {
        setIsLoadingMatches(false);
      }
    };

    loadMatches();
  }, [
    isDetailsVisible,
    matchesLoaded,
    isLoadingMatches,
    beatmapOsuId,
    tournament.tournament.id,
  ]);

  const startDate = tournament.tournament.startTime
    ? new Date(tournament.tournament.startTime)
    : null;
  const endDate = tournament.tournament.endTime
    ? new Date(tournament.tournament.endTime)
    : null;

  const tierInfo =
    tournament.avgRating != null
      ? getTierFromRating(tournament.avgRating)
      : null;

  const cardContent = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Link href={`/tournaments/${tournament.tournament.id}`}>
          <h2 className="text-lg font-semibold leading-tight sm:text-xl md:text-2xl">
            {tournament.tournament.name}
          </h2>
        </Link>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          {tournament.tournament.abbreviation && (
            <span className="text-muted-foreground font-mono text-sm">
              {tournament.tournament.abbreviation}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="text-muted-foreground flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <VerificationBadge
            verificationStatus={tournament.tournament.verificationStatus}
            entityType="tournament"
            displayText={true}
          />

          <LazerBadge isLazer={tournament.tournament.isLazer} />

          <div className="flex items-center gap-1.5">
            <RulesetIcon
              ruleset={tournament.tournament.ruleset}
              width={16}
              height={16}
              className="flex-shrink-0 fill-current"
            />
            <span className="truncate">
              {
                RulesetEnumHelper.getMetadata(tournament.tournament.ruleset)
                  .text
              }
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {tournament.tournament.lobbySize}v
              {tournament.tournament.lobbySize}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Gamepad2 className="h-4 w-4 flex-shrink-0" />
            <span>
              {tournament.gameCount}{' '}
              {tournament.gameCount === 1 ? 'game' : 'games'}
            </span>
          </div>

          {startDate && endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">
                {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className={cn(
            '-my-1 ml-auto h-8 gap-2 px-3 text-sm sm:ml-0',
            'hover:bg-accent hover:text-accent-foreground',
            'border-input border',
            isDetailsVisible && 'bg-accent text-accent-foreground'
          )}
          onClick={(e) => {
            e.preventDefault();
            setIsDetailsVisible(!isDetailsVisible);
          }}
        >
          {isDetailsVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Details
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="p-4 font-sans sm:p-6">
      {cardContent}

      {isDetailsVisible && (
        <div className="mt-4 border-t pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Average Rating
              </span>
              <span className="flex items-center gap-1.5 text-lg font-semibold">
                {tierInfo ? (
                  <TierIcon
                    tier={tierInfo.tier}
                    subTier={tierInfo.subTier}
                    width={20}
                    height={20}
                    tooltip
                  />
                ) : null}
                {tournament.avgRating != null
                  ? tournament.avgRating.toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Average Score
              </span>
              <span className="text-lg font-semibold">
                {tournament.avgScore != null
                  ? tournament.avgScore.toLocaleString()
                  : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Most Common Mod
              </span>
              <div className="flex h-5 w-14 items-center">
                <ModIconset
                  mods={tournament.mostCommonMod}
                  className="flex h-full items-center"
                  iconClassName="h-5"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <h4 className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">
              Matches
            </h4>

            {isLoadingMatches && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            )}

            {matchesError && (
              <p className="text-destructive text-sm">{matchesError}</p>
            )}

            {matchesLoaded && matches.length === 0 && (
              <p className="text-muted-foreground text-sm">No matches found</p>
            )}

            {matchesLoaded && matches.length > 0 && (
              <div className="bg-popover/50 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 border-b hover:bg-transparent">
                      <TableHead className="text-foreground font-semibold">
                        Match
                      </TableHead>
                      <TableHead className="text-foreground font-semibold">
                        Mods
                      </TableHead>
                      <TableHead className="text-foreground font-semibold">
                        Avg Rating
                      </TableHead>
                      <TableHead className="text-foreground font-semibold">
                        Avg Score
                      </TableHead>
                      <TableHead className="text-foreground font-semibold">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.flatMap((match) =>
                      match.games.map((game) => {
                        const gameTierInfo =
                          game.avgRating != null
                            ? getTierFromRating(game.avgRating)
                            : null;
                        return (
                          <TableRow
                            key={game.gameId}
                            className="border-border/30 hover:bg-popover/80 border-b transition-colors"
                          >
                            <TableCell className="py-2">
                              <Link
                                href={`/matches/${match.matchId}?gameId=${game.gameId}`}
                                className="truncate font-medium"
                              >
                                {match.matchName}
                              </Link>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex h-5 w-14 items-center">
                                <ModIconset
                                  mods={game.mods}
                                  className="flex h-full items-center"
                                  iconClassName="h-5"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="flex items-center gap-1">
                                {gameTierInfo ? (
                                  <TierIcon
                                    tier={gameTierInfo.tier}
                                    subTier={gameTierInfo.subTier}
                                    width={16}
                                    height={16}
                                    tooltip
                                  />
                                ) : null}
                                {game.avgRating != null
                                  ? game.avgRating.toLocaleString()
                                  : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="py-2">
                              {game.avgScore != null
                                ? game.avgScore.toLocaleString()
                                : '—'}
                            </TableCell>
                            <TableCell className="text-muted-foreground py-2">
                              {match.startTime
                                ? format(
                                    new Date(match.startTime),
                                    'MMM d, yyyy'
                                  )
                                : null}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
