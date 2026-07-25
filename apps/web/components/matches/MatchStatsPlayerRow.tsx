import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';

import RatingDelta from '@/components/rating/RatingDelta';
import TRText from '@/components/rating/TRText';
import { Badge } from '@/components/ui/badge';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatAccuracy } from '@/lib/utils/format';
import { formatScore, ProcessedPlayerStats } from './MatchStatsUtils';

interface MatchStatsPlayerRowProps {
  player: ProcessedPlayerStats;
  showRecord: boolean;
}

function TeamBadge({
  team,
}: {
  team: NonNullable<ProcessedPlayerStats['team']>;
}) {
  const label = team === 'red' ? 'Red' : 'Blue';

  return (
    <Badge
      variant="outline"
      className="gap-1.5 bg-popover px-1.5 py-0 font-normal text-popover-foreground"
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: `var(--team-${team})` }}
        aria-hidden="true"
      />
      {label}
    </Badge>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium tabular-nums">
        {value}
      </div>
    </div>
  );
}

function RatingRange({ player }: { player: ProcessedPlayerStats }) {
  if (player.ratingBefore === null || player.ratingAfter === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 tabular-nums"
      aria-label={`Rating changed from ${player.ratingBefore.toFixed(0)} to ${player.ratingAfter.toFixed(0)}`}
    >
      <span className="text-muted-foreground">
        {player.ratingBefore.toFixed(0)}
      </span>
      <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
      <span className="font-medium">{player.ratingAfter.toFixed(0)}</span>
    </span>
  );
}

const MatchStatsPlayerRow = function MatchStatsPlayerRow({
  player,
  showRecord,
}: MatchStatsPlayerRowProps) {
  return (
    <TableRow
      data-testid={`player-stats-row-${player.playerId}`}
      data-match-cost={player.matchCost}
      className="block p-4 transition-colors hover:bg-muted/50 lg:table-row lg:p-0"
    >
      <TableCell className="block p-0 lg:table-cell lg:min-w-44 lg:py-3 lg:pl-4">
        <div className="flex items-start justify-between gap-3 lg:items-center">
          <Link
            href={`/players/${player.playerId}`}
            className="flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <OsuAvatar
              osuId={player.osuId}
              username={player.username}
              size={32}
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {player.username}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {player.team && <TeamBadge team={player.team} />}
                {player.won && (
                  <Badge
                    variant="outline"
                    className="bg-popover px-1.5 py-0 text-popover-foreground"
                  >
                    <Trophy
                      className="size-3 text-primary"
                      aria-hidden="true"
                    />
                    Winner
                  </Badge>
                )}
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 flex-col items-end gap-1 lg:hidden">
            {player.ratingDelta !== null ? (
              <RatingDelta delta={player.ratingDelta} />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
            <div className="flex items-center gap-1 text-xs">
              <RatingRange player={player} />
              <TRText className="text-[10px]" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 rounded-lg bg-muted/50 p-3 lg:hidden">
          <MobileMetric
            label="Match cost"
            value={player.matchCost.toFixed(2)}
          />
          <MobileMetric
            label={showRecord ? 'Record' : 'Games'}
            value={
              showRecord
                ? `${player.gamesWon}–${player.gamesLost}`
                : player.gamesPlayed.toLocaleString()
            }
          />
          <MobileMetric
            label="Avg. score"
            value={formatScore(player.averageScore)}
          />
          <MobileMetric
            label="Accuracy"
            value={formatAccuracy(player.averageAccuracy)}
          />
          <MobileMetric
            label="Misses"
            value={player.averageMisses.toFixed(1)}
          />
          <MobileMetric
            label="Placement"
            value={player.averagePlacement.toFixed(1)}
          />
        </div>
      </TableCell>

      <TableCell className="hidden py-3 text-center tabular-nums lg:table-cell">
        {showRecord ? (
          <span
            aria-label={`${player.gamesWon} wins and ${player.gamesLost} losses`}
          >
            {player.gamesWon}–{player.gamesLost}
          </span>
        ) : (
          player.gamesPlayed.toLocaleString()
        )}
      </TableCell>
      <TableCell className="hidden py-3 text-center font-medium tabular-nums lg:table-cell">
        {player.matchCost.toFixed(2)}
      </TableCell>
      <TableCell className="hidden py-3 text-center text-sm lg:table-cell">
        <RatingRange player={player} />
      </TableCell>
      <TableCell className="hidden py-3 text-center lg:table-cell">
        {player.ratingDelta !== null ? (
          <RatingDelta delta={player.ratingDelta} />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden py-3 text-center tabular-nums lg:table-cell">
        {formatScore(player.averageScore)}
      </TableCell>
      <TableCell className="hidden py-3 text-center tabular-nums lg:table-cell">
        {formatAccuracy(player.averageAccuracy)}
      </TableCell>
      <TableCell className="hidden py-3 text-center tabular-nums lg:table-cell">
        {player.averageMisses.toFixed(1)}
      </TableCell>
      <TableCell className="hidden py-3 text-center tabular-nums lg:table-cell lg:pr-4">
        {player.averagePlacement.toFixed(1)}
      </TableCell>
    </TableRow>
  );
};

export default MatchStatsPlayerRow;
