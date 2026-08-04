'use client';

import {
  Activity,
  Clock3,
  Gamepad2,
  Layers,
  Music2,
  SearchX,
  Trophy,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import AudioPlayButton from '@/components/audio/AudioPlayButton';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import RulesetPill from '@/components/beatmaps/RulesetPill';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import { BEATMAP_CARD_GRID_CLASS } from '@/components/beatmaps/list/layout';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  isManiaRuleset,
} from '@/lib/beatmaps/presentation';
import {
  getModColor,
  getModForegroundColor,
  selectBeatmapListModGroups,
} from '@/lib/utils/mods';
import { formatPercentage } from '@/lib/utils/chart';
import { formatDuration } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

interface BeatmapListTableProps {
  beatmaps: BeatmapListItem[];
  isFiltered?: boolean;
  layout: BeatmapLayout;
}

export type BeatmapLayout = 'cards' | 'compact';

export default function BeatmapListTable({
  beatmaps,
  isFiltered = false,
  layout,
}: BeatmapListTableProps) {
  if (beatmaps.length === 0) {
    return (
      <div
        data-testid="beatmap-empty-state"
        className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center"
      >
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted dark:bg-secondary">
          <SearchX
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
        <h2 className="text-lg font-semibold">
          {isFiltered ? 'No beatmaps match' : 'No beatmaps yet'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFiltered ? 'Try fewer filters.' : 'No tournament maps are listed.'}
        </p>
        {isFiltered && (
          <Button asChild variant="outline" className="mt-5">
            <Link href="/beatmaps">Clear filters</Link>
          </Button>
        )}
      </div>
    );
  }

  const isCardLayout = layout === 'cards';

  return (
    <div
      role="list"
      aria-label="Tournament beatmaps"
      data-testid="beatmap-list"
      data-layout={layout}
      className={cn(
        isCardLayout
          ? cn(BEATMAP_CARD_GRID_CLASS, 'bg-muted/10 dark:bg-background/20')
          : 'divide-y'
      )}
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
        const topMods = beatmap.topMods ?? [];
        const showMods = !isManiaRuleset(ruleset);

        return (
          <article
            key={beatmap.id}
            role="listitem"
            data-testid={`beatmap-list-row-${beatmap.osuId}`}
            className={
              isCardLayout
                ? 'group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-[background-color,border-color,box-shadow] hover:border-primary/35 hover:shadow-sm dark:bg-secondary/35 dark:hover:bg-secondary/60'
                : 'group relative grid gap-3 p-3 transition-colors hover:bg-muted/35 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-stretch sm:gap-4 sm:p-4 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)] dark:hover:bg-secondary/60'
            }
          >
            <Link
              href={href}
              prefetch={false}
              aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
              className="absolute inset-0 z-10 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
            />

            <div
              data-testid="beatmap-cover-cell"
              className={cn('relative min-w-0', !isCardLayout && 'sm:min-h-28')}
            >
              <BeatmapCover
                beatmapsetOsuId={beatmap.beatmapsetOsuId}
                alt={`${beatmap.artist} - ${beatmap.title} cover`}
                sizes={
                  isCardLayout
                    ? '(max-width: 767px) calc(100vw - 3.5rem), (max-width: 1279px) calc(50vw - 3rem), 400px'
                    : '(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 192px, (max-width: 1279px) 208px, 224px'
                }
                priority={index === 0}
                className={cn(
                  'w-full shadow-sm',
                  isCardLayout
                    ? 'aspect-[16/7] rounded-none'
                    : 'h-28 rounded-lg sm:absolute sm:inset-0 sm:h-full'
                )}
                imageClassName="transition-transform duration-500 group-hover:scale-[1.035]"
              />
              {isCardLayout ? (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 bg-gradient-to-b from-black/55 to-transparent"
                  />
                  <RulesetPill
                    ruleset={beatmap.ruleset}
                    diffName={beatmap.diffName}
                    tone="overlay"
                    className="pointer-events-none absolute top-2 left-2 z-20"
                  />
                  <StarRatingPill
                    starRating={beatmap.sr}
                    className="pointer-events-none absolute top-2 right-2 z-20"
                  />
                </>
              ) : null}
              {beatmap.beatmapsetOsuId ? (
                <span
                  className={cn(
                    'pointer-events-none absolute z-20 inline-flex rounded-full bg-black/65 text-white shadow-lg backdrop-blur-sm',
                    'right-2 bottom-2 p-1'
                  )}
                >
                  <AudioPlayButton
                    beatmapsetOsuId={beatmap.beatmapsetOsuId}
                    artist={beatmap.artist}
                    title={beatmap.title}
                    difficulty={beatmap.diffName}
                    size="md"
                    variant="ghost"
                    className="pointer-events-auto rounded-full text-white hover:bg-white/20 hover:text-white"
                  />
                </span>
              ) : null}
            </div>

            <div
              data-testid="beatmap-card-content"
              className={cn(
                'min-w-0',
                isCardLayout
                  ? 'flex flex-1 flex-col p-3.5 sm:p-4'
                  : 'sm:flex sm:flex-col sm:justify-center'
              )}
            >
              <div className="min-w-0">
                <div
                  data-testid="beatmap-heading"
                  className={cn(
                    'min-w-0',
                    isCardLayout
                      ? // One line per field so every card's text block is the
                        // same height and the footer never shifts.
                        ''
                      : 'flex flex-wrap items-baseline gap-x-3 gap-y-0.5'
                  )}
                >
                  <h2
                    data-testid="beatmap-title"
                    title={beatmap.title}
                    className={cn(
                      'min-w-0 text-base leading-snug font-semibold transition-colors group-hover:text-primary sm:text-lg',
                      isCardLayout ? 'truncate' : 'break-words'
                    )}
                  >
                    {beatmap.title}
                  </h2>
                  <p
                    data-testid="beatmap-difficulty-name"
                    title={beatmap.diffName}
                    className={cn(
                      'min-w-0 text-sm font-medium text-foreground/85',
                      isCardLayout ? 'truncate' : 'break-words'
                    )}
                  >
                    [{beatmap.diffName}]
                  </p>
                </div>
                <div
                  data-testid="beatmap-attribution"
                  className={cn(
                    'mt-0.5 flex min-w-0 items-center gap-x-3 text-xs text-muted-foreground',
                    isCardLayout ? 'gap-y-0' : 'flex-wrap gap-y-0.5'
                  )}
                >
                  <p
                    data-testid="beatmap-artist"
                    title={beatmap.artist}
                    className={cn(
                      'flex min-w-0 items-center gap-1.5',
                      isCardLayout && 'shrink'
                    )}
                  >
                    <Music2 className="size-3.5 shrink-0" aria-hidden="true" />
                    <span
                      data-testid="beatmap-artist-name"
                      className={cn(
                        'min-w-0',
                        isCardLayout ? 'truncate' : 'break-words'
                      )}
                    >
                      {beatmap.artist}
                    </span>
                  </p>
                  <p
                    data-testid="beatmap-mapper"
                    title={beatmap.creator ?? 'Unknown mapper'}
                    className={cn(
                      'flex min-w-0 items-center gap-1.5',
                      isCardLayout && 'shrink'
                    )}
                  >
                    <UserRound
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      data-testid="beatmap-mapper-name"
                      className={cn(
                        'min-w-0',
                        isCardLayout ? 'truncate' : 'break-words'
                      )}
                    >
                      {beatmap.creator ?? 'Unknown mapper'}
                    </span>
                  </p>
                </div>
              </div>

              <div
                data-testid="beatmap-data-summary"
                className={cn(
                  isCardLayout &&
                    // Two stacked 24px rows on phones, where six items will not
                    // fit side by side; one 24px row from `sm` up, where they
                    // will (h-9 minus the 12px of top padding).
                    'mt-auto flex min-w-0 flex-col gap-1.5 pt-3 text-xs text-muted-foreground sm:h-9 sm:flex-row sm:items-center sm:gap-x-3 sm:text-sm'
                )}
              >
                <div
                  data-testid="beatmap-primary-metrics"
                  className={cn(
                    'flex min-w-0 items-center gap-x-3',
                    isCardLayout
                      ? 'h-6 shrink-0 sm:h-auto'
                      : 'mt-2 flex-wrap gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm'
                  )}
                >
                  {isCardLayout ? null : (
                    <>
                      <Metric
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
                      <StarRatingPill
                        starRating={beatmap.sr}
                        className="ml-1 min-w-15"
                      />
                    </>
                  )}
                  <Metric
                    className={cn(!isCardLayout && 'w-14')}
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
                  <Metric
                    className={cn(!isCardLayout && 'w-17')}
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
                  className={cn(
                    'flex min-w-0 items-center gap-x-3',
                    isCardLayout
                      ? 'h-6 overflow-hidden sm:h-auto'
                      : 'mt-1.5 flex-wrap gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm'
                  )}
                >
                  <Metric
                    icon={
                      <Gamepad2
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    }
                    value={beatmap.verifiedGameCount.toLocaleString()}
                    valueClassName={cn(!isCardLayout && 'min-w-[3ch]')}
                    ariaLabel={`${beatmap.verifiedGameCount.toLocaleString()} verified games`}
                    testId="beatmap-games-count"
                  />
                  <Metric
                    icon={
                      <Trophy className="size-4 shrink-0" aria-hidden="true" />
                    }
                    value={beatmap.verifiedTournamentCount.toLocaleString()}
                    valueClassName={cn(!isCardLayout && 'min-w-[3ch]')}
                    ariaLabel={`${beatmap.verifiedTournamentCount.toLocaleString()} verified tournaments`}
                    testId="beatmap-tournaments-count"
                  />
                  {showMods ? (
                    <TopModsBreakdown
                      mods={topMods}
                      fixedWidth={!isCardLayout}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TopModsBreakdown({
  mods,
  fixedWidth = false,
}: {
  mods: NonNullable<BeatmapListItem['topMods']>;
  /** Reserve a fixed slot so mods line up across compact-layout rows. */
  fixedWidth?: boolean;
}) {
  if (mods.length === 0) {
    return (
      <div
        data-testid="beatmap-mods-summary"
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap',
          fixedWidth && 'w-52'
        )}
      >
        <Layers className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs">No mod data</span>
      </div>
    );
  }

  const displayedMods = selectBeatmapListModGroups(mods);

  return (
    <div
      data-testid="beatmap-mods-summary"
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5',
        fixedWidth && 'w-52'
      )}
    >
      <Layers className="size-4 shrink-0" aria-hidden="true" />
      <ul
        data-testid="beatmap-top-mods"
        aria-label="Top mods by score usage"
        className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden text-[11px] sm:text-xs"
      >
        {displayedMods.map(({ mod, mods, percentage }) => (
          <li
            key={`${mods}-${mod}`}
            data-testid="beatmap-mod-group"
            className="inline-flex h-6 items-center gap-1 rounded-full border border-current/20 px-2 whitespace-nowrap"
            style={{
              backgroundColor: getModColor(mods),
              color: getModForegroundColor(mods),
            }}
          >
            <span className="font-semibold text-inherit">{mod}</span>
            <span className="font-medium text-inherit tabular-nums">
              {formatPercentage(percentage, 1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({
  icon,
  value,
  ariaLabel,
  testId,
  className,
  valueClassName,
}: {
  icon: ReactNode;
  value: ReactNode;
  ariaLabel?: string;
  testId?: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <span
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground',
        className
      )}
    >
      {icon}
      <span
        data-testid={testId ? `${testId}-value` : undefined}
        className={cn(
          'font-medium text-foreground tabular-nums',
          valueClassName
        )}
      >
        {value}
      </span>
    </span>
  );
}
