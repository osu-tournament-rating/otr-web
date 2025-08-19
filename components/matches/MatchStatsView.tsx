'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  MatchStatisticsDTO,
  MatchDTO,
} from '@osu-tournament-rating/otr-api-client';
import MatchStatsHighlightCard from './MatchStatsHighlightCard';
import MatchStatsPlayerRow from './MatchStatsPlayerRow';
import {
  processMatchStatistics,
  calculateHighlightStats,
  ProcessedPlayerStats,
} from './MatchStatsUtils';
import SimpleTooltip from '@/components/simple-tooltip';

const UI_CONSTANTS = {
  DEFAULT_SORT_KEY: 'ratingDelta' as const,
  DEFAULT_SORT_DIRECTION: 'desc' as const,
} as const;

type SortKey = keyof ProcessedPlayerStats;

interface MatchStatsViewProps {
  stats: MatchStatisticsDTO;
  match: MatchDTO;
}

export default function MatchStatsView({ stats, match }: MatchStatsViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>(
    UI_CONSTANTS.DEFAULT_SORT_KEY
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    UI_CONSTANTS.DEFAULT_SORT_DIRECTION
  );

  const hasCompleteStats =
    stats &&
    stats.playerMatchStats &&
    Array.isArray(stats.playerMatchStats) &&
    stats.playerMatchStats.length > 0;
  const processedPlayers = useMemo(
    () =>
      hasCompleteStats
        ? processMatchStatistics(stats, match.players ?? [])
        : [],
    [stats, match.players, hasCompleteStats]
  );
  const highlightStats = useMemo(
    () => calculateHighlightStats(processedPlayers),
    [processedPlayers]
  );
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const SortButton = React.memo(
    ({ column, children }: { column: SortKey; children: React.ReactNode }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-7 text-xs hover:bg-transparent hover:text-foreground data-[state=open]:bg-accent"
        onClick={() => handleSort(column)}
        aria-label={`Sort by ${children} ${sortKey === column ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
        aria-pressed={sortKey === column}
      >
        <span className="hidden sm:inline">{children}</span>
        <span className="sm:hidden">
          {typeof children === 'string' ? children.split(' ')[0] : children}
        </span>
        {sortKey === column ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : (
            <ArrowDown className="ml-1 h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        )}
      </Button>
    )
  );
  SortButton.displayName = 'SortButton';

  const isTeamMatch = processedPlayers.some((p) => p.team !== undefined);
  const is1v1Match = processedPlayers.length === 2;
  if (!hasCompleteStats) {
    return (
      <Card className="relative overflow-hidden bg-card/50 p-6 md:p-8">
        <div className="flex flex-col items-center justify-center gap-4 py-8 md:py-12">
          {/* Animated icon container */}
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

            {/* Progress indicator */}
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-0" />
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-150" />
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary delay-300" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-5 lg:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:mb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 lg:h-9 lg:w-9">
            <BarChart3 className="h-4 w-4 text-primary lg:h-4.5 lg:w-4.5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Match Statistics</h3>
            <p className="text-xs text-muted-foreground">
              Performance insights & player metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-0.5 text-sm text-muted-foreground">
          <Users className="h-3 w-3" />
          <span className="text-xs font-medium">
            {processedPlayers.length} players
          </span>
        </div>
      </div>

      {/* Responsive grid with mobile-first approach */}
      <div className="mb-3 lg:mb-3.5">
        <div
          className={`grid gap-2 lg:gap-1.5 ${
            highlightStats.length === 4
              ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-2'
              : highlightStats.length === 6
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3'
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
              Click headers to sort
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table role="table" aria-label="Player performance statistics">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[160px] sm:min-w-[200px] md:min-w-[180px]">
                  Player
                </TableHead>
                {!is1v1Match && (
                  <TableHead className="w-[60px] sm:w-[70px]">
                    <SimpleTooltip content="Points won/lost this match">
                      <span aria-label="Wins and losses">W-L</span>
                    </SimpleTooltip>
                  </TableHead>
                )}
                <TableHead className="w-[70px] sm:w-[80px] md:w-[100px]">
                  <SortButton column="ratingBefore">
                    <span className="hidden sm:inline">Before</span>
                    <span className="sm:hidden">Pre</span>
                  </SortButton>
                </TableHead>
                <TableHead className="w-[70px] sm:w-[80px] md:w-[100px]">
                  <SortButton column="ratingAfter">
                    <span className="hidden sm:inline">After</span>
                    <span className="sm:hidden">Post</span>
                  </SortButton>
                </TableHead>
                <TableHead className="w-[80px] sm:w-[90px] md:w-[100px]">
                  <SortButton column="ratingDelta">
                    <span className="hidden sm:inline">Change</span>
                    <span className="sm:hidden">Δ</span>
                  </SortButton>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton column="averageScore">Avg Score</SortButton>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortButton column="averageAccuracy">Accuracy</SortButton>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <SortButton column="averageMisses">Avg Misses</SortButton>
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  <SortButton column="averagePlacement">Placement</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
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
