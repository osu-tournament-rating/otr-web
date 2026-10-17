'use client';

import {
  Activity,
  Clock3,
  Gamepad2,
  Music2,
  Trophy,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps } from 'react';

import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import BeatmapCoverPreview from '@/components/beatmaps/BeatmapCoverPreview';
import BeatmapMetric from '@/components/beatmaps/BeatmapMetric';
import BeatmapTopMods from '@/components/beatmaps/BeatmapTopMods';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import RulesetIcon from '@/components/icons/RulesetIcon';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  isManiaRuleset,
} from '@/lib/beatmaps/presentation';
import type { BeatmapTableRow } from '@/lib/beatmaps/table-row';
import { formatCount, formatCountOf } from '@/lib/kit/format/number';
import { ROW_HOVER_TINT } from '@/lib/kit/tables/row';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/kit/format/date';

interface BeatmapListRowsProps extends ComponentProps<'div'> {
  beatmaps: BeatmapTableRow[];
  /**
   * A tournament's pool: its own game counts and no tournament count, titles
   * under the pool's heading, and the ruleset only where the pool mixes them.
   */
  pool?: boolean;
}

/**
 * The compact list surface: a full-bleed cover beside a single text block.
 * The beatmap list's compact layout, and on phones its table and a
 * tournament's pool.
 */
export default function BeatmapListRows({
  beatmaps,
  pool = false,
  className,
  ...props
}: BeatmapListRowsProps) {
  // A row title sits one level under the heading above the list.
  const Title = pool ? 'h3' : 'h2';
  const showRuleset =
    !pool ||
    new Set(
      beatmaps.map((beatmap) =>
        getBeatmapDisplayRuleset(beatmap.ruleset, beatmap.diffName)
      )
    ).size > 1;

  return (
    <div
      role="list"
      aria-label="Tournament beatmaps"
      className={cn('divide-y', className)}
      {...props}
    >
      {beatmaps.map((beatmap, index) => {
        const href = `/beatmaps/${beatmap.osuId}`;
        const ruleset = getBeatmapDisplayRuleset(
          beatmap.ruleset,
          beatmap.diffName
        );
        const rulesetLabel = getBeatmapRulesetLabel(
          beatmap.ruleset,
          beatmap.diffName
        );
        const showMods = !isManiaRuleset(ruleset);

        return (
          <div
            key={beatmap.id}
            role="listitem"
            data-testid={`beatmap-list-row-${beatmap.osuId}`}
            className={cn(
              'group relative grid gap-3 p-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-stretch sm:gap-4 sm:p-4 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)]',
              ROW_HOVER_TINT
            )}
          >
            <Link
              href={href}
              prefetch={false}
              aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
              className="absolute inset-0 z-10 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
            />

            <div
              data-testid="beatmap-cover-cell"
              className="relative min-w-0 sm:min-h-28"
            >
              <BeatmapCover
                beatmapsetOsuId={beatmap.beatmapsetOsuId}
                alt={`${beatmap.artist} - ${beatmap.title} cover`}
                sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 192px, (max-width: 1279px) 208px, 224px"
                priority={index === 0}
                className="h-28 w-full rounded-lg shadow-sm sm:absolute sm:inset-0 sm:h-full"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.035]"
              />
              <BeatmapCoverPreview
                beatmapsetOsuId={beatmap.beatmapsetOsuId}
                artist={beatmap.artist}
                title={beatmap.title}
                difficulty={beatmap.diffName}
                size="md"
                className="rounded-lg"
              />
            </div>

            <div
              data-testid="beatmap-card-content"
              className="min-w-0 sm:flex sm:flex-col sm:justify-center"
            >
              <div className="min-w-0">
                <div
                  data-testid="beatmap-heading"
                  className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5"
                >
                  <Title
                    data-testid="beatmap-title"
                    title={beatmap.title}
                    className={cn(
                      'min-w-0 text-base leading-snug font-semibold break-words transition-colors group-hover:text-link sm:text-lg',
                      beatmap.isDeleted && 'text-muted-foreground line-through'
                    )}
                  >
                    {beatmap.title}
                  </Title>
                  <p
                    data-testid="beatmap-difficulty-name"
                    title={beatmap.diffName}
                    className="min-w-0 text-sm font-medium break-words text-foreground/85"
                  >
                    [{beatmap.diffName}]
                  </p>
                </div>
                <div
                  data-testid="beatmap-attribution"
                  className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground"
                >
                  <p
                    data-testid="beatmap-artist"
                    title={beatmap.artist}
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    <Music2 className="size-3.5 shrink-0" aria-hidden="true" />
                    <span
                      data-testid="beatmap-artist-name"
                      className="min-w-0 break-words"
                    >
                      {beatmap.artist}
                    </span>
                  </p>
                  <p
                    data-testid="beatmap-mapper"
                    title={beatmap.creator ?? 'Unknown mapper'}
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    <UserRound
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      data-testid="beatmap-mapper-name"
                      className="min-w-0 break-words"
                    >
                      {beatmap.creator ?? 'Unknown mapper'}
                    </span>
                  </p>
                  {beatmap.isDeleted ? <p>Deleted from osu!</p> : null}
                </div>
              </div>

              <div data-testid="beatmap-data-summary">
                <div
                  data-testid="beatmap-primary-metrics"
                  className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm"
                >
                  {showRuleset ? (
                    <BeatmapMetric
                      testId="beatmap-ruleset"
                      icon={
                        <RulesetIcon
                          ruleset={ruleset}
                          className="size-4 shrink-0 fill-current"
                          aria-hidden="true"
                        />
                      }
                      value={rulesetLabel}
                    />
                  ) : null}
                  <StarRatingPill
                    starRating={beatmap.sr}
                    className={cn('min-w-15', showRuleset && 'ml-1')}
                  />
                  <BeatmapMetric
                    className="w-14"
                    testId="beatmap-bpm"
                    icon={
                      <Activity
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    }
                    value={Math.round(beatmap.bpm)}
                    ariaLabel={`${Math.round(beatmap.bpm)} BPM`}
                  />
                  <BeatmapMetric
                    className="w-17"
                    testId="beatmap-duration"
                    icon={
                      <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                    }
                    value={formatDuration(Number(beatmap.totalLength))}
                    ariaLabel={`${formatDuration(Number(beatmap.totalLength))} duration`}
                  />
                </div>

                <div
                  data-testid="beatmap-usage-summary"
                  className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm"
                >
                  <BeatmapMetric
                    testId="beatmap-games-count"
                    icon={
                      <Gamepad2
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    }
                    value={formatCount(beatmap.gameCount)}
                    valueClassName="min-w-[3ch]"
                    // The list counts verified games; a pool counts its own.
                    ariaLabel={formatCountOf(
                      beatmap.gameCount,
                      pool ? 'game' : 'verified game'
                    )}
                  />
                  {pool ? null : (
                    <BeatmapMetric
                      testId="beatmap-tournaments-count"
                      icon={
                        <Trophy
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={formatCount(beatmap.tournamentCount)}
                      valueClassName="min-w-[3ch]"
                      ariaLabel={formatCountOf(
                        beatmap.tournamentCount,
                        'verified tournament'
                      )}
                    />
                  )}
                  {showMods ? (
                    <BeatmapTopMods mods={beatmap.topMods} fixedWidth />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
