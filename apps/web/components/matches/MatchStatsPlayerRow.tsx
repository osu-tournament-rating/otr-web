import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ProcessedPlayerStats,
  formatScore,
  getRatingChangeColor,
} from './MatchStatsUtils';

const AVATAR_SIZE = {
  WIDTH: 28,
  HEIGHT: 28,
} as const;

const RATING_PRECISION = {
  DISPLAY: 0,
  DELTA: 1,
  COMPARISON: 10,
} as const;

interface MatchStatsPlayerRowProps {
  player: ProcessedPlayerStats;
  showPerformanceMetrics?: boolean;
  showWLColumn?: boolean;
}

const MatchStatsPlayerRow = React.memo(function MatchStatsPlayerRow({
  player,
  showPerformanceMetrics = true,
  showWLColumn = true,
}: MatchStatsPlayerRowProps) {
  const [imageError, setImageError] = useState(false);

  const ratingChangeIcon = useMemo(() => {
    if (player.ratingDelta === null) return null;

    const roundedDelta =
      Math.round(player.ratingDelta * RATING_PRECISION.COMPARISON) /
      RATING_PRECISION.COMPARISON;

    if (roundedDelta === 0) return <Minus className="h-3.5 w-3.5" />;
    if (player.ratingDelta > 0) return <TrendingUp className="h-3.5 w-3.5" />;
    if (player.ratingDelta < 0) return <TrendingDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  }, [player.ratingDelta]);

  const teamBadge = useMemo(() => {
    if (!player.team) return null;
    return player.team === 'red' ? (
      <Badge variant="destructive" className="text-xs">
        Red
      </Badge>
    ) : (
      <Badge className="bg-blue-600 text-xs hover:bg-blue-700">Blue</Badge>
    );
  }, [player.team]);

  return (
    <TableRow
      className={cn(
        'hover:bg-muted/50 group transition-colors',
        player.won && 'bg-green-500/5 hover:bg-green-500/10'
      )}
    >
      {/* Player column */}
      <TableCell className="w-[140px] max-w-[160px] py-2">
        <Link
          href={`/players/${player.osuId}`}
          className="flex items-center gap-2 transition-opacity hover:opacity-80 sm:gap-2.5"
        >
          {!imageError ? (
            <Image
              src={player.avatarUrl}
              alt={player.username}
              width={AVATAR_SIZE.WIDTH}
              height={AVATAR_SIZE.HEIGHT}
              className="ring-border/10 rounded-full ring-1"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-full">
              <User className="text-muted-foreground h-4 w-4" />
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium sm:text-sm">
              {player.username}
            </span>
            {player.team && <div className="mt-0.5">{teamBadge}</div>}
          </div>
        </Link>
      </TableCell>
      {/* W-L column */}
      {showWLColumn && (
        <TableCell className="py-2 text-center">
          <div
            className="text-xs font-medium"
            aria-label={`${player.gamesWon} wins, ${player.gamesLost} losses`}
          >
            <span className="text-green-600">{player.gamesWon}</span>
            <span className="text-muted-foreground px-0.5" aria-hidden="true">
              -
            </span>
            <span className="text-red-600">{player.gamesLost}</span>
          </div>
        </TableCell>
      )}

      {/* Rating columns */}
      <TableCell className="text-muted-foreground py-2 text-center text-xs sm:text-sm">
        {player.ratingBefore?.toFixed(RATING_PRECISION.DISPLAY) ?? '-'}
      </TableCell>
      <TableCell className="py-2 text-center text-xs font-medium sm:text-sm">
        {player.ratingAfter?.toFixed(RATING_PRECISION.DISPLAY) ?? '-'}
      </TableCell>
      <TableCell className="py-2 text-center">
        <div
          className={cn(
            'inline-flex items-center justify-center gap-0.5 rounded-md px-1 py-0.5 text-xs font-semibold sm:gap-1 sm:px-1.5',
            player.ratingDelta !== null &&
              Math.round(player.ratingDelta * RATING_PRECISION.COMPARISON) /
                RATING_PRECISION.COMPARISON >
                0 &&
              'bg-green-500/10',
            player.ratingDelta !== null &&
              Math.round(player.ratingDelta * RATING_PRECISION.COMPARISON) /
                RATING_PRECISION.COMPARISON <
                0 &&
              'bg-red-500/10',
            player.ratingDelta !== null &&
              Math.round(player.ratingDelta * RATING_PRECISION.COMPARISON) /
                RATING_PRECISION.COMPARISON ===
                0 &&
              'bg-gray-500/10',
            getRatingChangeColor(player.ratingDelta)
          )}
        >
          <span className="hidden sm:inline">{ratingChangeIcon}</span>
          <span>
            {player.ratingDelta !== null ? (
              Math.abs(player.ratingDelta) < 0.05 ? (
                '0.0'
              ) : (
                <>
                  {player.ratingDelta > 0 && '+'}
                  {player.ratingDelta.toFixed(RATING_PRECISION.DELTA)}
                </>
              )
            ) : (
              '-'
            )}
          </span>
        </div>
      </TableCell>
      {/* Performance metrics - consistent breakpoints matching headers */}
      {showPerformanceMetrics && (
        <>
          <TableCell className="hidden py-2 text-center text-sm md:table-cell">
            {formatScore(player.averageScore)}
          </TableCell>
          <TableCell className="hidden py-2 text-center text-sm md:table-cell">
            {player.averageAccuracy.toFixed(2)}%
          </TableCell>
          <TableCell className="hidden py-2 text-center text-sm md:table-cell">
            {player.averageMisses.toFixed(1)}
          </TableCell>
          <TableCell className="hidden py-2 text-center text-sm md:table-cell">
            {player.averagePlacement.toFixed(1)}
          </TableCell>
        </>
      )}
    </TableRow>
  );
});

export default MatchStatsPlayerRow;
