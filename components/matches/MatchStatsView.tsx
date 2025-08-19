'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, BarChart3 } from 'lucide-react';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import MatchStatsHighlightCard from './MatchStatsHighlightCard';
import MatchStatsPlayerRow from './MatchStatsPlayerRow';
import {
  processMatchStatistics,
  calculateHighlightStats,
  ProcessedPlayerStats,
} from './MatchStatsUtils';
import SimpleTooltip from '@/components/simple-tooltip';
import TierIcon from '@/components/icons/TierIcon';
import { getTierFromRating } from '@/lib/utils/tierData';

const UI_CONSTANTS = {
  DEFAULT_SORT_KEY: 'ratingDelta' as const,
  DEFAULT_SORT_DIRECTION: 'desc' as const,
  GRID_LAYOUTS: {
    FOUR_CARDS: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4',
    FIVE_CARDS: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    SIX_CARDS: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6',
    DEFAULT: 'grid-cols-2 md:grid-cols-3',
  },
} as const;

type SortKey = keyof ProcessedPlayerStats;
type SortDirection = 'asc' | 'desc';

interface MatchStatsViewProps {
  match: MatchDTO;
}

const StatsProcessingCard = React.memo(() => (
  <Card className="relative overflow-hidden bg-card/50 p-6 md:p-8">
    <div className="flex flex-col items-center justify-center gap-4 py-8 md:py-12">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 backdrop-blur-sm">
          <BarChart3 className="h-7 w-7 text-primary" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="text-xl font-semibold">Statistics Processing</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Match statistics are being calculated. This typically takes a few
          minutes. Check back soon for detailed performance insights.
        </p>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-0" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-150" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-300" />
        </div>
      </div>
    </div>
  </Card>
));
StatsProcessingCard.displayName = 'StatsProcessingCard';

export default function MatchStatsView({ match }: MatchStatsViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>(
    UI_CONSTANTS.DEFAULT_SORT_KEY
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    UI_CONSTANTS.DEFAULT_SORT_DIRECTION
  );

  const hasCompleteStats =
    match &&
    match.playerMatchStats &&
    Array.isArray(match.playerMatchStats) &&
    match.playerMatchStats.length > 0;
  const processedPlayers = useMemo(
    () =>
      hasCompleteStats
        ? processMatchStatistics(match, match.players ?? [])
        : [],
    [match, hasCompleteStats]
  );
  const highlightStats = useMemo(
    () => calculateHighlightStats(processedPlayers, match.winRecord),
    [processedPlayers, match.winRecord]
  );

  // Calculate average rating for the pill
  const averageRatingInfo = useMemo(() => {
    const playersWithRatings = processedPlayers.filter(
      (p) => p.ratingAfter !== null
    );
    if (playersWithRatings.length === 0) return null;

    const ratings = playersWithRatings.map((p) => p.ratingAfter as number);
    const averageRating =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const tierInfo = getTierFromRating(averageRating);

    return {
      rating: Math.round(averageRating),
      tier: tierInfo.tier,
      subTier: tierInfo.subTier,
    };
  }, [processedPlayers]);
  const sortedPlayers = useMemo(() => {
    return [...processedPlayers].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return sortDirection === 'asc' ? 1 : -1;
      const comparison =
        typeof aVal === 'string' && typeof bVal === 'string'
          ? aVal.localeCompare(bVal)
          : (aVal as number) - (bVal as number);

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [processedPlayers, sortKey, sortDirection]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDirection('desc');
      }
    },
    [sortKey]
  );

  const SortButton = React.memo(
    ({ column, children }: { column: SortKey; children: React.ReactNode }) => {
      const isActive = sortKey === column;
      const sortIcon = useMemo(() => {
        if (!isActive)
          return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
        return sortDirection === 'asc' ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        );
      }, [isActive]);

      return (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-7 px-1 text-xs hover:bg-transparent hover:text-foreground data-[state=open]:bg-accent sm:px-2"
          onClick={() => handleSort(column)}
          aria-label={`Sort by ${children} ${isActive ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
          aria-pressed={isActive}
        >
          <span className="truncate">{children}</span>
          {sortIcon}
        </Button>
      );
    }
  );
  SortButton.displayName = 'SortButton';

  const isTeamMatch = processedPlayers.some((p) => p.team !== undefined);
  const is1v1Match = processedPlayers.length === 2;

  if (!hasCompleteStats) {
    return <StatsProcessingCard />;
  }

  return (
    <Card className="p-5 md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold">Match Performance</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Player statistics and achievements
            </p>
          </div>
        </div>
        {averageRatingInfo && (
          <SimpleTooltip content="Average rating of all players in this match">
            <div className="ml-2 flex shrink-0 items-center gap-2 rounded-full border border-primary/10 bg-primary/5 px-3.5 py-1.5 text-sm transition-all duration-200 hover:border-primary/20 hover:bg-primary/10 hover:shadow-sm">
              <TierIcon
                tier={averageRatingInfo.tier}
                subTier={averageRatingInfo.subTier}
                width={20}
                height={20}
              />
              <span className="text-sm font-semibold text-foreground">
                {averageRatingInfo.rating} TR
              </span>
            </div>
          </SimpleTooltip>
        )}
      </div>

      <div className="mb-5">
        <div
          className={`grid gap-3 ${
            highlightStats.length === 4
              ? UI_CONSTANTS.GRID_LAYOUTS.FOUR_CARDS
              : highlightStats.length === 5
                ? UI_CONSTANTS.GRID_LAYOUTS.FIVE_CARDS
                : highlightStats.length === 6
                  ? UI_CONSTANTS.GRID_LAYOUTS.SIX_CARDS
                  : UI_CONSTANTS.GRID_LAYOUTS.DEFAULT
          }`}
        >
          {highlightStats.map((stat) => (
            <MatchStatsHighlightCard key={stat.id} stat={stat} />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card/50">
        <div className="border-b bg-muted/30 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold tracking-wide">
              Player Performance
            </h4>
            <span className="text-xs text-muted-foreground">
              Average performance statistics
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table role="table" aria-label="Player performance statistics">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/* Player column - always visible */}
                <TableHead className="min-w-[140px] sm:min-w-[180px]">
                  Player
                </TableHead>

                {/* W-L column - visible in non-1v1 matches */}
                {!is1v1Match && (
                  <TableHead className="w-[50px] text-center sm:w-[60px]">
                    <SimpleTooltip content="Points won/lost this match">
                      <span aria-label="Wins and losses">W-L</span>
                    </SimpleTooltip>
                  </TableHead>
                )}

                {/* Rating columns - always visible with responsive labels */}
                <TableHead className="w-[60px] text-center sm:w-[70px]">
                  <SortButton column="ratingBefore">
                    <span className="hidden sm:inline">Before</span>
                    <span className="sm:hidden">Pre</span>
                  </SortButton>
                </TableHead>
                <TableHead className="w-[60px] text-center sm:w-[70px]">
                  <SortButton column="ratingAfter">
                    <span className="hidden sm:inline">After</span>
                    <span className="sm:hidden">Post</span>
                  </SortButton>
                </TableHead>
                <TableHead className="w-[70px] text-center sm:w-[80px]">
                  <SortButton column="ratingDelta">
                    <span className="hidden sm:inline">Change</span>
                    <span className="sm:hidden">+/-</span>
                  </SortButton>
                </TableHead>

                {/* Performance metrics - hidden on mobile, visible on md+ */}
                <TableHead className="hidden text-center md:table-cell md:w-[80px]">
                  <SortButton column="averageScore">Score</SortButton>
                </TableHead>
                <TableHead className="hidden text-center md:table-cell md:w-[70px]">
                  <SortButton column="averageAccuracy">
                    <span className="hidden lg:inline">Accuracy</span>
                    <span className="lg:hidden">Acc</span>
                  </SortButton>
                </TableHead>
                <TableHead className="hidden text-center md:table-cell md:w-[60px]">
                  <SortButton column="averageMisses">
                    <span className="hidden lg:inline">Misses</span>
                    <span className="lg:hidden">Miss</span>
                  </SortButton>
                </TableHead>
                <TableHead className="hidden text-center md:table-cell md:w-[70px]">
                  <SortButton column="averagePlacement">
                    <span className="hidden lg:inline">Placement</span>
                    <span className="lg:hidden">Pos</span>
                  </SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => (
                <MatchStatsPlayerRow
                  key={player.playerId}
                  player={player}
                  showPerformanceMetrics={true}
                  showWLColumn={!is1v1Match}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {isTeamMatch && (
        <div className="mt-6 rounded-lg border bg-muted/50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Team statistics coming soon
          </p>
        </div>
      )}
    </Card>
  );
}
