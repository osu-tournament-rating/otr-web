'use client';

import {
  Activity,
  Clock3,
  Gamepad2,
  Layers,
  Music2,
  SearchX,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import AudioPlayButton from '@/components/audio/AudioPlayButton';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import RulesetIcon from '@/components/icons/RulesetIcon';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  isManiaRuleset,
} from '@/lib/beatmaps/presentation';
import {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '@/lib/beatmaps/star-rating-color';
import { getModColor } from '@/lib/utils/mods';
import { formatPercentage } from '@/lib/utils/chart';
import { formatDuration } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

interface BeatmapListTableProps {
  beatmaps: BeatmapListItem[];
  isFiltered?: boolean;
}

export default function BeatmapListTable({
  beatmaps,
  isFiltered = false,
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
          <Link
            href="/beatmaps"
            className="mt-5 inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Clear filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div role="list" aria-label="Tournament beatmaps">
      <div className="divide-y">
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
                {beatmap.beatmapsetOsuId ? (
                  <span className="pointer-events-none absolute right-2 bottom-2 z-20 inline-flex rounded-full bg-black/65 p-1 text-white shadow-lg backdrop-blur-sm">
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
                      <Music2
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
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

                  <div
                    data-testid="beatmap-primary-metrics"
                    className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm"
                  >
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
                    <Metric
                      className="ml-1 h-6 min-w-15 justify-center gap-1 rounded-full border border-current/20 px-1"
                      testId="beatmap-star-rating"
                      icon={
                        <Star
                          className="size-4 shrink-0 fill-current"
                          aria-hidden="true"
                        />
                      }
                      value={beatmap.sr.toFixed(2)}
                      valueClassName="text-inherit"
                      style={{
                        backgroundColor: getStarRatingColor(beatmap.sr),
                        color: getStarRatingForegroundColor(beatmap.sr),
                      }}
                      ariaLabel={`${beatmap.sr.toFixed(2)} star rating`}
                    />
                    <Metric
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
                    <Metric
                      className="w-17"
                      testId="beatmap-duration"
                      icon={
                        <Clock3
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={formatDuration(Number(beatmap.totalLength))}
                      ariaLabel={`${formatDuration(Number(beatmap.totalLength))} duration`}
                    />
                  </div>

                  <div
                    data-testid="beatmap-usage-summary"
                    className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground sm:text-sm"
                  >
                    <Metric
                      icon={
                        <Gamepad2
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={beatmap.verifiedGameCount.toLocaleString()}
                      valueClassName="min-w-[3ch]"
                      ariaLabel={`${beatmap.verifiedGameCount.toLocaleString()} verified games`}
                      testId="beatmap-games-count"
                    />
                    <Metric
                      icon={
                        <Trophy
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={beatmap.verifiedTournamentCount.toLocaleString()}
                      valueClassName="min-w-[3ch]"
                      ariaLabel={`${beatmap.verifiedTournamentCount.toLocaleString()} verified tournaments`}
                      testId="beatmap-tournaments-count"
                    />
                    {showMods ? <TopModsBreakdown mods={topMods} /> : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function TopModsBreakdown({
  mods,
}: {
  mods: NonNullable<BeatmapListItem['topMods']>;
}) {
  if (mods.length === 0) {
    return (
      <div
        data-testid="beatmap-mods-summary"
        className="inline-flex w-52 items-center gap-1.5 whitespace-nowrap"
      >
        <Layers className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs">No mod data</span>
      </div>
    );
  }

  return (
    <div
      data-testid="beatmap-mods-summary"
      className="inline-flex w-52 min-w-0 items-center gap-1.5"
    >
      <Layers className="size-4 shrink-0" aria-hidden="true" />
      <ul
        data-testid="beatmap-top-mods"
        aria-label="Top mods by score usage"
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs"
      >
        {mods.map(({ mod, mods, percentage }) => (
          <li
            key={`${mods}-${mod}`}
            className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: getModColor(mods) }}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">{mod}</span>
            <span className="tabular-nums">
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
  style,
}: {
  icon: ReactNode;
  value: ReactNode;
  ariaLabel?: string;
  testId?: string;
  className?: string;
  valueClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      data-testid={testId}
      aria-label={ariaLabel}
      style={style}
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
