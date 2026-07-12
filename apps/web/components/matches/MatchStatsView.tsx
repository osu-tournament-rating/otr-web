'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MatchDetail } from '@/lib/orpc/schema/match';
import MatchStatsHighlightCard from './MatchStatsHighlightCard';
import MatchStatsPlayerRow from './MatchStatsPlayerRow';
import MatchTeamScoresChart from './MatchTeamScoresChart';
import {
  calculateHighlightStats,
  processMatchStatistics,
  type ProcessedPlayerStats,
} from './MatchStatsUtils';

type SortKey =
  | 'username'
  | 'netWins'
  | 'gamesPlayed'
  | 'matchCost'
  | 'ratingAfter'
  | 'ratingDelta'
  | 'averageScore'
  | 'averageAccuracy'
  | 'averageMisses'
  | 'averagePlacement';
type SortDirection = 'asc' | 'desc';

const DEFAULT_SORT_KEY: SortKey = 'matchCost';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'username', label: 'Player' },
  { value: 'matchCost', label: 'Match cost' },
  { value: 'ratingAfter', label: 'Rating' },
  { value: 'ratingDelta', label: 'Rating change' },
  { value: 'averageScore', label: 'Average score' },
  { value: 'averageAccuracy', label: 'Accuracy' },
  { value: 'averageMisses', label: 'Misses' },
  { value: 'averagePlacement', label: 'Placement' },
];

interface MatchStatsViewProps {
  match: MatchDetail;
}

function StatsProcessingCard() {
  return (
    <Card className="!p-6">
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <BarChart3 className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Statistics Pending</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Match statistics will appear after ratings are generated. Check back
            after the next ratings update.
          </p>
        </div>
      </div>
    </Card>
  );
}

function SortButton({
  column,
  label,
  children,
  sortKey,
  sortDirection,
  onSort,
}: {
  column: SortKey;
  label: string;
  children: ReactNode;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortKey === column;
  const nextDirection =
    isActive && sortDirection === 'asc'
      ? 'descending'
      : isActive || column === 'username'
        ? 'ascending'
        : 'descending';
  const Icon = !isActive
    ? ArrowUpDown
    : sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-1 text-xs hover:bg-muted hover:text-foreground"
      onClick={() => onSort(column)}
      aria-label={`Sort by ${label}, ${nextDirection}`}
    >
      {children}
      <Icon
        className={isActive ? 'size-3.5' : 'size-3.5 opacity-45'}
        aria-hidden="true"
      />
    </Button>
  );
}

function getSortValue(
  player: ProcessedPlayerStats,
  sortKey: SortKey
): string | number | null {
  if (sortKey === 'netWins') {
    return player.gamesWon - player.gamesLost;
  }

  return player[sortKey];
}

function getAriaSort(
  column: SortKey,
  sortKey: SortKey,
  sortDirection: SortDirection
): 'ascending' | 'descending' | 'none' {
  if (column !== sortKey) return 'none';
  return sortDirection === 'asc' ? 'ascending' : 'descending';
}

export default function MatchStatsView({ match }: MatchStatsViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    DEFAULT_SORT_DIRECTION
  );
  const hasRecordedResult = Boolean(match.winRecord);
  const recordSortKey: SortKey = hasRecordedResult ? 'netWins' : 'gamesPlayed';
  const sortOptions = useMemo(
    () => [
      SORT_OPTIONS[0],
      {
        value: recordSortKey,
        label: hasRecordedResult ? 'Record' : 'Games played',
      },
      ...SORT_OPTIONS.slice(1),
    ],
    [hasRecordedResult, recordSortKey]
  );

  const hasCompleteStats = Boolean(match.playerMatchStats?.length);
  const processedPlayers = useMemo(
    () =>
      hasCompleteStats
        ? processMatchStatistics(match, match.players ?? [])
        : [],
    [match, hasCompleteStats]
  );
  const highlightStats = useMemo(
    () => calculateHighlightStats(processedPlayers, match),
    [processedPlayers, match]
  );
  const sortedPlayers = useMemo(() => {
    return [...processedPlayers].sort((first, second) => {
      const firstValue = getSortValue(first, sortKey);
      const secondValue = getSortValue(second, sortKey);

      if (firstValue === null && secondValue === null) {
        return first.username.localeCompare(second.username);
      }
      if (firstValue === null) return 1;
      if (secondValue === null) return -1;

      const comparison =
        typeof firstValue === 'string' && typeof secondValue === 'string'
          ? firstValue.localeCompare(secondValue)
          : (firstValue as number) - (secondValue as number);

      if (comparison === 0) {
        return first.username.localeCompare(second.username);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [processedPlayers, sortKey, sortDirection]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
        return;
      }

      setSortKey(key);
      setSortDirection(key === 'username' ? 'asc' : 'desc');
    },
    [sortKey]
  );

  const handleMobileSort = (value: string) => {
    const key = value as SortKey;
    setSortKey(key);
    setSortDirection(key === 'username' ? 'asc' : 'desc');
  };

  if (!hasCompleteStats) {
    return <StatsProcessingCard />;
  }

  return (
    <div className="space-y-4">
      <Card data-testid="match-stats-summary" className="gap-4 !p-4 sm:!p-6">
        <div className="flex items-start gap-2">
          <BarChart3 className="mt-0.5 size-6 shrink-0 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Match Statistics</h3>
            <p className="text-sm text-muted-foreground">
              Performance across verified games in this match
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
          {highlightStats.map((stat) => (
            <MatchStatsHighlightCard key={stat.id} stat={stat} />
          ))}
        </div>
      </Card>

      <MatchTeamScoresChart games={match.games} />

      <Card data-testid="player-stats-table" className="gap-4 !p-4 sm:!p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Player Performance</h3>
              <p className="text-sm text-muted-foreground">
                Score, accuracy, misses, and placement are per-game averages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Select value={sortKey} onValueChange={handleMobileSort}>
              <SelectTrigger
                className="h-8 min-w-0 flex-1 sm:w-40 sm:flex-none"
                aria-label="Sort players by"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                setSortDirection((current) =>
                  current === 'asc' ? 'desc' : 'asc'
                )
              }
              aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="size-4" aria-hidden="true" />
              ) : (
                <ArrowDown className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table
            className="block w-full lg:table lg:min-w-[860px]"
            aria-label="Player performance statistics"
          >
            <TableHeader className="hidden bg-muted/50 lg:table-header-group">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="pl-4"
                  aria-sort={getAriaSort('username', sortKey, sortDirection)}
                >
                  <SortButton
                    column="username"
                    label="player"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Player
                  </SortButton>
                </TableHead>
                <TableHead
                  className="text-center"
                  aria-sort={getAriaSort(recordSortKey, sortKey, sortDirection)}
                >
                  <SortButton
                    column={recordSortKey}
                    label={hasRecordedResult ? 'record' : 'games played'}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    {hasRecordedResult ? 'Record' : 'Games'}
                  </SortButton>
                </TableHead>
                <TableHead
                  data-testid="match-cost-header"
                  className="text-center"
                  aria-sort={getAriaSort('matchCost', sortKey, sortDirection)}
                >
                  <SortButton
                    column="matchCost"
                    label="match cost"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Cost
                  </SortButton>
                </TableHead>
                <TableHead
                  className="text-center"
                  aria-sort={getAriaSort('ratingAfter', sortKey, sortDirection)}
                >
                  <SortButton
                    column="ratingAfter"
                    label="rating"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Rating
                  </SortButton>
                </TableHead>
                <TableHead
                  className="text-center"
                  aria-sort={getAriaSort('ratingDelta', sortKey, sortDirection)}
                >
                  <SortButton
                    column="ratingDelta"
                    label="rating change"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Change
                  </SortButton>
                </TableHead>
                <TableHead
                  className="text-center"
                  aria-sort={getAriaSort(
                    'averageScore',
                    sortKey,
                    sortDirection
                  )}
                >
                  <SortButton
                    column="averageScore"
                    label="average score"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Score
                  </SortButton>
                </TableHead>
                <TableHead
                  className="text-center"
                  aria-sort={getAriaSort(
                    'averageAccuracy',
                    sortKey,
                    sortDirection
                  )}
                >
                  <SortButton
                    column="averageAccuracy"
                    label="accuracy"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Accuracy
                  </SortButton>
                </TableHead>
                <TableHead
                  className="text-center"
                  aria-sort={getAriaSort(
                    'averageMisses',
                    sortKey,
                    sortDirection
                  )}
                >
                  <SortButton
                    column="averageMisses"
                    label="misses"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Misses
                  </SortButton>
                </TableHead>
                <TableHead
                  className="pr-4 text-center"
                  aria-sort={getAriaSort(
                    'averagePlacement',
                    sortKey,
                    sortDirection
                  )}
                >
                  <SortButton
                    column="averagePlacement"
                    label="placement"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Placement
                  </SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="block lg:table-row-group">
              {sortedPlayers.map((player) => (
                <MatchStatsPlayerRow
                  key={player.playerId}
                  player={player}
                  showRecord={hasRecordedResult}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
