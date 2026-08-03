'use client';

import { ArrowUpRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LazerBadge } from '@/components/badges/LazerBadge';
import VerificationBadge from '@/components/badges/VerificationBadge';
import BeatmapPoolGamesPanel from '@/components/beatmap/BeatmapPoolGamesPanel';
import ModIconset from '@/components/icons/ModIconset';
import { Button } from '@/components/ui/button';
import { getPoolDate, isPoolVerified } from '@/lib/beatmaps/records';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';

/**
 * Column widths shared with the pool-list header in BeatmapRecordsCard so the
 * header captions stay aligned with every row's cells.
 */
export const POOL_COLUMN_CLASSES = {
  mod: 'w-14',
  games: 'w-22',
  toggle: 'size-7',
} as const;

/** One tournament that pooled this beatmap, expandable into its games. */
export default function BeatmapPoolRow({
  pool,
  beatmapOsuId,
  maxGames,
}: {
  pool: BeatmapTournamentUsage;
  beatmapOsuId: number;
  /** Busiest pool on the beatmap, so every row's bar shares one scale. */
  maxGames: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const verified = isPoolVerified(pool);
  const date = getPoolDate(pool);
  const dateLabel = date ? formatUTCDate(new Date(date)) : 'Unavailable';
  const rankRange =
    pool.rankRangeLowerBound === 1
      ? 'Open rank'
      : formatRankRange(pool.rankRangeLowerBound);
  const fill = maxGames > 0 ? (pool.gameCount / maxGames) * 100 : 0;
  const panelId = `beatmap-pool-games-${pool.tournament.id}`;

  return (
    <article data-testid={`beatmap-tournament-row-${pool.tournament.id}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 transition-colors hover:bg-muted/25">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href={`/tournaments/${pool.tournament.id}`}
              prefetch={false}
              className="inline-flex min-w-0 items-center gap-1 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="truncate">{pool.tournament.name}</span>
              <ArrowUpRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </Link>
            <span
              data-testid={`beatmap-tournament-verification-${pool.tournament.id}`}
              data-verification-status={pool.tournament.verificationStatus}
              className="shrink-0"
            >
              <VerificationBadge
                verificationStatus={pool.tournament.verificationStatus}
                entityType="tournament"
                minimal
              />
            </span>
            {pool.tournament.isLazer && (
              <span className="shrink-0">
                <LazerBadge isLazer />
              </span>
            )}
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground tabular-nums">
            {dateLabel} · {pool.tournament.lobbySize}v
            {pool.tournament.lobbySize} · {rankRange}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div
            data-testid="beatmap-tournament-mod"
            className={cn('flex h-5 items-center', POOL_COLUMN_CLASSES.mod)}
          >
            <ModIconset
              mods={pool.mostCommonMod}
              freemod={pool.mostCommonModFreemod}
              className="flex h-full items-center"
              iconClassName="h-5"
            />
          </div>
          <div
            className={cn(
              'flex items-center justify-end gap-2',
              POOL_COLUMN_CLASSES.games
            )}
          >
            <span
              aria-hidden
              className="h-1.5 w-12 overflow-hidden rounded-full bg-muted"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${verified ? fill : 0}%` }}
              />
            </span>
            <span
              aria-label={
                verified
                  ? `${pool.gameCount} verified ${pool.gameCount === 1 ? 'game' : 'games'}`
                  : 'No verified game count for this pool record'
              }
              className="min-w-6 text-right font-mono text-sm font-semibold tabular-nums"
            >
              {verified ? pool.gameCount.toLocaleString() : '—'}
            </span>
          </div>
          {verified && pool.gameCount > 0 ? (
            <Button
              data-testid={`beatmap-tournament-details-toggle-${pool.tournament.id}`}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${isOpen ? 'Hide' : 'Show'} games for ${pool.tournament.name}`}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setIsOpen((open) => !open)}
              className={POOL_COLUMN_CLASSES.toggle}
            >
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  isOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </Button>
          ) : (
            <span className={POOL_COLUMN_CLASSES.toggle} aria-hidden />
          )}
        </div>
      </div>

      {isOpen && (
        <BeatmapPoolGamesPanel
          beatmapOsuId={beatmapOsuId}
          tournamentId={pool.tournament.id}
          panelId={panelId}
        />
      )}
    </article>
  );
}
