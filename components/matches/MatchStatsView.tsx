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
      <Card className="p-4 md:p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="text-lg font-semibold">Pending Calculation</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              This verified tournament is awaiting processing, please check back
              later for detailed match statistics.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-4 flex items-start justify-between md:mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Match Statistics</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{processedPlayers.length} players</span>
        </div>
      </div>
      <div
        className={`mb-2 grid gap-2 sm:gap-3 md:mb-3 ${
          highlightStats.length === 4
            ? 'grid-cols-2 md:grid-cols-4'
            : highlightStats.length === 6
              ? 'grid-cols-3 md:grid-cols-3'
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        }`}
      >
        {highlightStats.map((stat) => (
          <MatchStatsHighlightCard key={stat.id} stat={stat} />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border bg-card/50">
        <div className="border-b bg-muted/30 px-4 py-3">
          <h4 className="text-sm font-semibold">Player Performance</h4>
        </div>
        <Table role="table" aria-label="Player performance statistics">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px] md:min-w-[180px]">
                Player
              </TableHead>
              {!is1v1Match && (
                <TableHead className="w-[70px]">
                  <SimpleTooltip content="Points won/lost this match">
                    <span aria-label="Wins and losses">W-L</span>
                  </SimpleTooltip>
                </TableHead>
              )}
              <TableHead className="w-[80px] md:w-[100px]">
                <SortButton column="ratingBefore">Before</SortButton>
              </TableHead>
              <TableHead className="w-[80px] md:w-[100px]">
                <SortButton column="ratingAfter">After</SortButton>
              </TableHead>
              <TableHead className="w-[90px] md:w-[100px]">
                <SortButton column="ratingDelta">Change</SortButton>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton column="averageScore">Avg Score</SortButton>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton column="averageAccuracy">Accuracy</SortButton>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton column="averageMisses">Avg Misses</SortButton>
              </TableHead>
              <TableHead className="hidden md:table-cell">
                <SortButton column="averagePlacement">Placement</SortButton>
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
