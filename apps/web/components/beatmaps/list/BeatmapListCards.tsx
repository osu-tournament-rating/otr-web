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
import RulesetPill from '@/components/beatmaps/RulesetPill';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import { BEATMAP_CARD_GRID_CLASS } from '@/components/beatmaps/list/layout';
import {
  getBeatmapDisplayRuleset,
  isManiaRuleset,
} from '@/lib/beatmaps/presentation';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/date';

interface BeatmapListCardsProps extends ComponentProps<'div'> {
  beatmaps: BeatmapListItem[];
}

/** The default beatmap list surface: artwork-led cards, two per row on desktop. */
export default function BeatmapListCards({
  beatmaps,
  className,
  ...props
}: BeatmapListCardsProps) {
  return (
    <div
      role="list"
      aria-label="Tournament beatmaps"
      className={cn(
        BEATMAP_CARD_GRID_CLASS,
        'bg-muted/10 dark:bg-background/20',
        className
      )}
      {...props}
    >
      {beatmaps.map((beatmap, index) => {
        const href = `/beatmaps/${beatmap.osuId}`;
        const ruleset = getBeatmapDisplayRuleset(
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
            className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-[background-color,border-color,box-shadow] hover:border-primary/35 hover:shadow-sm dark:bg-secondary/35 dark:hover:bg-secondary/60"
          >
            <Link
              href={href}
              prefetch={false}
              aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
              className="absolute inset-0 z-10 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
            />

            <div data-testid="beatmap-cover-cell" className="relative min-w-0">
              <BeatmapCover
                beatmapsetOsuId={beatmap.beatmapsetOsuId}
                alt={`${beatmap.artist} - ${beatmap.title} cover`}
                sizes="(max-width: 767px) calc(100vw - 3.5rem), (max-width: 1279px) calc(50vw - 3rem), 400px"
                priority={index === 0}
                className="aspect-[16/7] w-full rounded-none shadow-sm"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.035]"
              />
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
              <BeatmapCoverPreview
                beatmapsetOsuId={beatmap.beatmapsetOsuId}
                artist={beatmap.artist}
                title={beatmap.title}
                difficulty={beatmap.diffName}
                size="lg"
              />
            </div>

            <div
              data-testid="beatmap-card-content"
              className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4"
            >
              <div className="min-w-0">
                {/* One line per field so every card's text block is the same
                    height and the footer never shifts. */}
                <div data-testid="beatmap-heading" className="min-w-0">
                  <h2
                    data-testid="beatmap-title"
                    title={beatmap.title}
                    className="min-w-0 truncate text-base leading-snug font-semibold transition-colors group-hover:text-primary sm:text-lg"
                  >
                    {beatmap.title}
                  </h2>
                  <p
                    data-testid="beatmap-difficulty-name"
                    title={beatmap.diffName}
                    className="min-w-0 truncate text-sm font-medium text-foreground/85"
                  >
                    [{beatmap.diffName}]
                  </p>
                </div>
                <div
                  data-testid="beatmap-attribution"
                  className="mt-0.5 flex min-w-0 items-center gap-x-3 gap-y-0 text-xs text-muted-foreground"
                >
                  <p
                    data-testid="beatmap-artist"
                    title={beatmap.artist}
                    className="flex min-w-0 shrink items-center gap-1.5"
                  >
                    <Music2 className="size-3.5 shrink-0" aria-hidden="true" />
                    <span
                      data-testid="beatmap-artist-name"
                      className="min-w-0 truncate"
                    >
                      {beatmap.artist}
                    </span>
                  </p>
                  <p
                    data-testid="beatmap-mapper"
                    title={beatmap.creator ?? 'Unknown mapper'}
                    className="flex min-w-0 shrink items-center gap-1.5"
                  >
                    <UserRound
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span
                      data-testid="beatmap-mapper-name"
                      className="min-w-0 truncate"
                    >
                      {beatmap.creator ?? 'Unknown mapper'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Two stacked 24px rows on phones, where six items will not fit
                  side by side; one 24px row from `sm` up, where they will (h-9
                  minus the 12px of top padding). */}
              <div
                data-testid="beatmap-data-summary"
                className="mt-auto flex min-w-0 flex-col gap-1.5 pt-3 text-xs text-muted-foreground sm:h-9 sm:flex-row sm:items-center sm:gap-x-3 sm:text-sm"
              >
                <div
                  data-testid="beatmap-primary-metrics"
                  className="flex h-6 min-w-0 shrink-0 items-center gap-x-3 sm:h-auto"
                >
                  <BeatmapMetric
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
                  className="flex h-6 min-w-0 items-center gap-x-3 overflow-hidden sm:h-auto"
                >
                  <BeatmapMetric
                    testId="beatmap-games-count"
                    icon={
                      <Gamepad2
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    }
                    value={beatmap.verifiedGameCount.toLocaleString()}
                    ariaLabel={`${beatmap.verifiedGameCount.toLocaleString()} verified games`}
                  />
                  <BeatmapMetric
                    testId="beatmap-tournaments-count"
                    icon={
                      <Trophy className="size-4 shrink-0" aria-hidden="true" />
                    }
                    value={beatmap.verifiedTournamentCount.toLocaleString()}
                    ariaLabel={`${beatmap.verifiedTournamentCount.toLocaleString()} verified tournaments`}
                  />
                  {showMods ? <BeatmapTopMods mods={topMods} /> : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
