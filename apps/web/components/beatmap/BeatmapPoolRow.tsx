'use client';

import type { Ruleset } from '@otr/core/osu';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LazerBadge } from '@/components/badges/LazerBadge';
import VerificationBadge from '@/components/badges/VerificationBadge';
import BeatmapPoolGamesPanel from '@/components/beatmap/BeatmapPoolGamesPanel';
import ModIconset from '@/components/icons/ModIconset';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import {
  getPoolDate,
  isCrossRulesetPool,
  isPoolVerified,
} from '@/lib/beatmaps/records';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
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
  games: 'sm:w-22',
  toggle: 'size-7',
} as const;

/** One tournament that pooled this beatmap, expandable into its games. */
export default function BeatmapPoolRow({
  pool,
  beatmapOsuId,
  maxGames,
  beatmapRuleset,
}: {
  pool: BeatmapTournamentUsage;
  beatmapOsuId: number;
  /** Busiest pool on the beatmap, so every row's bar shares one scale. */
  maxGames: number;
  /** Ruleset of the beatmap, so pools from other rulesets can be flagged. */
  beatmapRuleset: Ruleset;
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
  // Without verified games `mostCommonMod` defaults to 0 (NM), which would
  // fabricate a mod nobody recorded — show nothing instead.
  const hasVerifiedGames = verified && pool.gameCount > 0;
  const rulesetLabel = `${RulesetEnumHelper.getMetadata(pool.tournament.ruleset).text} tournament`;

  const renderMod = (iconClassName: string, alwaysExpanded = false) =>
    hasVerifiedGames ? (
      <ModIconset
        mods={pool.mostCommonMod}
        freemod={pool.mostCommonModFreemod}
        className="flex h-full items-center"
        iconClassName={iconClassName}
        alwaysExpanded={alwaysExpanded}
      />
    ) : (
      <span aria-hidden className="text-xs text-muted-foreground">
        —
      </span>
    );

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
              <span className="line-clamp-2 sm:line-clamp-1">
                {pool.tournament.name}
              </span>
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
            {isCrossRulesetPool(pool.tournament.ruleset, beatmapRuleset) && (
              <SimpleTooltip content={rulesetLabel}>
                <span
                  className="shrink-0 text-muted-foreground"
                  role="img"
                  aria-label={rulesetLabel}
                >
                  <RulesetIcon
                    ruleset={pool.tournament.ruleset}
                    className="size-3.5 fill-current [&_path]:fill-current"
                  />
                </span>
              </SimpleTooltip>
            )}
          </div>
          {/* A div, not a p: ModIconset renders divs, which cannot nest in a p. */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <span className="truncate">
              {dateLabel} · {pool.tournament.lobbySize}v
              {pool.tournament.lobbySize} · {rankRange}
            </span>
            {/* At 16px tall the default -ml-4 overlap swallows all but a ~5px
                sliver of every icon but the last, and there is no hover to
                fan them out on touch — so the meta line always shows them
                expanded. */}
            <span className="flex h-4 shrink-0 items-center sm:hidden">
              {renderMod('h-4', true)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div
            data-testid="beatmap-tournament-mod"
            className={cn(
              'hidden h-5 items-center sm:flex',
              POOL_COLUMN_CLASSES.mod
            )}
          >
            {renderMod('h-5')}
          </div>
          <div
            className={cn(
              'flex items-center justify-end gap-2',
              POOL_COLUMN_CLASSES.games
            )}
          >
            <span
              aria-hidden
              className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-muted sm:block"
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
              className="min-w-6 text-right text-sm font-semibold tabular-nums"
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
