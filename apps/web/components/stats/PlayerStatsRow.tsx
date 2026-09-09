import Link from 'next/link';
import type * as React from 'react';

import { OsuAvatar } from '@/components/ui/osu-avatar';
import type { PlayerStatsPlayer } from '@otr/core/stats/player-stats';
import { cn } from '@/lib/utils';
import { formatChartNumber, formatRating } from '@/lib/utils/chart';
import { getTierFromRating, getTierString } from '@/lib/utils/tierData';

const playerLink =
  'rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

/** The list body inside a player statistics card. */
export function StatList({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col', className)} {...props} />;
}

/** One list row: 8px vertical padding, 10px gap, restrained hover. */
export function StatRow({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-testid="stats-row"
      className={cn(
        'flex items-center gap-2.5 border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/25',
        className
      )}
      {...props}
    />
  );
}

/** Position of a row after the leader, in its own fixed slot. */
export function StatRank({ rank }: { rank: number }) {
  return (
    <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
      {rank}
    </span>
  );
}

export function StatPlayerName({
  player,
  className,
}: {
  player: PlayerStatsPlayer;
  className?: string;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      prefetch={false}
      title={player.username}
      className={cn(
        playerLink,
        'block truncate text-sm font-medium hover:underline',
        className
      )}
    >
      {player.username}
    </Link>
  );
}

export function StatPlayerLink({
  player,
  size = 24,
  className,
  nameClassName,
}: {
  player: PlayerStatsPlayer;
  size?: number;
  className?: string;
  nameClassName?: string;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      prefetch={false}
      title={player.username}
      className={cn(
        playerLink,
        'group flex min-w-0 items-center gap-2',
        className
      )}
    >
      <OsuAvatar osuId={player.osuId} username={player.username} size={size} />
      <span
        className={cn(
          'truncate text-sm font-medium group-hover:underline',
          nameClassName
        )}
      >
        {player.username}
      </span>
    </Link>
  );
}

/** `Diamond II · 1,688 TR`; nothing when the player has no rating in the ruleset. */
export function StatPlayerTier({ rating }: { rating: number | null }) {
  if (rating === null) {
    return null;
  }

  const { tier, subTier } = getTierFromRating(rating);

  return (
    <p className="truncate text-xs text-muted-foreground">
      {getTierString(tier, subTier)} · {formatRating(rating)} TR
    </p>
  );
}

/** A number in a fixed-width, right-aligned column. */
export function StatValue({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'shrink-0 text-right text-lg leading-6 font-bold tabular-nums',
        className
      )}
    >
      {formatChartNumber(value)}
    </span>
  );
}
