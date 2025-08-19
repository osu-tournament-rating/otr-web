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
    // Check if rating change rounds to 0.0
    const roundedDelta = Math.round(player.ratingDelta * 10) / 10;
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
        'group transition-colors hover:bg-muted/50',
        player.won && 'bg-green-500/5 hover:bg-green-500/10'
      )}
    >
      <TableCell className="py-2">
        <Link
          href={`/players/${player.osuId}`}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          {!imageError ? (
            <Image
              src={player.avatarUrl}
              alt={player.username}
              width={28}
              height={28}
              className="rounded-full ring-1 ring-border/10"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">
              {player.username}
            </span>
            {player.team && <div className="mt-0.5">{teamBadge}</div>}
          </div>
        </Link>
      </TableCell>
      {showWLColumn && (
        <TableCell className="py-2">
          <div
            className="text-xs font-medium"
            aria-label={`${player.gamesWon} wins, ${player.gamesLost} losses`}
          >
            <span className="text-green-600">{player.gamesWon}</span>
            <span className="px-0.5 text-muted-foreground" aria-hidden="true">
              -
            </span>
            <span className="text-red-600">{player.gamesLost}</span>
          </div>
        </TableCell>
      )}
      <TableCell className="py-2 text-sm text-muted-foreground">
        {player.ratingBefore?.toFixed(0) ?? '-'}
      </TableCell>
      <TableCell className="py-2 text-sm font-medium">
        {player.ratingAfter?.toFixed(0) ?? '-'}
      </TableCell>
      <TableCell className="py-2">
        <div
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold',
            player.ratingDelta !== null &&
              Math.round(player.ratingDelta * 10) / 10 > 0 &&
              'bg-green-500/10',
            player.ratingDelta !== null &&
              Math.round(player.ratingDelta * 10) / 10 < 0 &&
              'bg-red-500/10',
            player.ratingDelta !== null &&
              Math.round(player.ratingDelta * 10) / 10 === 0 &&
              'bg-gray-500/10',
            getRatingChangeColor(player.ratingDelta)
          )}
        >
          {ratingChangeIcon}
          <span>
            {player.ratingDelta !== null && player.ratingDelta > 0 && '+'}
            {player.ratingDelta?.toFixed(1) ?? '-'}
          </span>
        </div>
      </TableCell>
      {showPerformanceMetrics && (
        <>
          <TableCell className="hidden py-2 text-sm md:table-cell">
            {formatScore(player.averageScore)}
          </TableCell>
          <TableCell className="hidden py-2 text-sm md:table-cell">
            {player.averageAccuracy.toFixed(2)}%
          </TableCell>
          <TableCell className="hidden py-2 text-sm md:table-cell">
            {player.averageMisses.toFixed(1)}
          </TableCell>
          <TableCell className="hidden py-2 text-sm md:table-cell">
            {player.averagePlacement.toFixed(1)}
          </TableCell>
        </>
      )}
    </TableRow>
  );
});

export default MatchStatsPlayerRow;
