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
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/date';

interface BeatmapListRowsProps extends ComponentProps<'div'> {
  beatmaps: BeatmapListItem[];
}

/**
 * The compact list surface: a full-bleed cover beside a single text block.
 * Also the phone fallback for the table layout, which cannot fit ten columns.
 */
export default function BeatmapListRows({
  beatmaps,
  className,
  ...props
}: BeatmapListRowsProps) {
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
        const topMods = beatmap.topMods ?? [];
        const showMods = !isManiaRuleset(ruleset);

        return (
          <article
            key={beatmap.id}
            role="listitem"
            data-testid={`beatmap-list-row-${beatmap.osuId}`}
            className="group relative grid gap-3 p-3 transition-colors hover:bg-muted/35 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-stretch sm:gap-4 sm:p-4 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)] dark:hover:bg-secondary/60"
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
                  <h2
                    data-testid="beatmap-title"
                    title={beatmap.title}
                    className="min-w-0 text-base leading-snug font-semibold break-words transition-colors group-hover:text-primary sm:text-lg"
                  >
                    {beatmap.title}
                  </h2>
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
                </div>
              </div>

              <div data-testid="beatmap-data-summary">
                <div
                  data-testid="beatmap-primary-metrics"
                  className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm"
                >
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
                  <StarRatingPill
                    starRating={beatmap.sr}
                    className="ml-1 min-w-15"
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
                    value={beatmap.verifiedGameCount.toLocaleString()}
                    valueClassName="min-w-[3ch]"
                    ariaLabel={`${beatmap.verifiedGameCount.toLocaleString()} verified games`}
                  />
                  <BeatmapMetric
                    testId="beatmap-tournaments-count"
                    icon={
                      <Trophy className="size-4 shrink-0" aria-hidden="true" />
                    }
                    value={beatmap.verifiedTournamentCount.toLocaleString()}
                    valueClassName="min-w-[3ch]"
                    ariaLabel={`${beatmap.verifiedTournamentCount.toLocaleString()} verified tournaments`}
                  />
                  {showMods ? (
                    <BeatmapTopMods mods={topMods} fixedWidth />
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
