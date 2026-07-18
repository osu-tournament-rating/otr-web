'use client';

import {
  Activity,
  ChevronRight,
  Clock3,
  Gamepad2,
  Layers,
  SearchX,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import AudioPlayButton from '@/components/audio/AudioPlayButton';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import RulesetIcon from '@/components/icons/RulesetIcon';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
  getDifficultyColor,
} from '@/lib/beatmaps/presentation';
import type { BeatmapBaseMod } from '@/lib/utils/mods';
import { formatDuration } from '@/lib/utils/date';

const baseModColors: Record<BeatmapBaseMod, string> = {
  DT: 'var(--mod-double-time)',
  HR: 'var(--mod-hard-rock)',
  HD: 'var(--mod-hidden)',
  EZ: 'var(--mod-easy)',
  NM: 'var(--muted-foreground)',
  Other: 'var(--mod-freemod)',
};

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
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base leading-snug font-semibold transition-colors group-hover:text-primary sm:text-lg">
                        {beatmap.artist} – {beatmap.title}
                      </h2>
                      <p className="mt-0.5 truncate text-sm font-medium text-foreground/85">
                        [{beatmap.diffName}]
                      </p>
                    </div>
                    <ChevronRight
                      className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    data-testid="beatmap-usage-summary"
                    className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:text-sm"
                  >
                    <Metric
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
                      icon={
                        <Star
                          className="size-4 shrink-0"
                          style={{ color: getDifficultyColor(beatmap.sr) }}
                          aria-hidden="true"
                        />
                      }
                      value={beatmap.sr.toFixed(2)}
                      unit="SR"
                      ariaLabel={`${beatmap.sr.toFixed(2)} star rating`}
                    />
                    <Metric
                      icon={
                        <Activity
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={Math.round(beatmap.bpm)}
                      unit="BPM"
                      ariaLabel={`${Math.round(beatmap.bpm)} BPM`}
                    />
                    <Metric
                      icon={
                        <Clock3
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={formatDuration(Number(beatmap.totalLength))}
                      ariaLabel={`${formatDuration(Number(beatmap.totalLength))} duration`}
                    />
                    <Metric
                      icon={
                        <Gamepad2
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                      }
                      value={beatmap.verifiedGameCount.toLocaleString()}
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
                      ariaLabel={`${beatmap.verifiedTournamentCount.toLocaleString()} verified tournaments`}
                      testId="beatmap-tournaments-count"
                    />
                    <TopModsBreakdown mods={topMods} />
                  </div>

                  <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <UserRound
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    Mapped by {beatmap.creator ?? 'Unknown mapper'}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">#{beatmap.osuId}</span>
                  </p>
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
      <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <Layers className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-[11px] sm:text-xs">No mod data</span>
      </div>
    );
  }

  return (
    <div className="inline-flex min-w-0 items-center gap-1.5">
      <Layers className="size-4 shrink-0" aria-hidden="true" />
      <ul
        data-testid="beatmap-top-mods"
        aria-label="Top mods by score usage"
        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs"
      >
        {mods.map(({ mod, percentage }) => (
          <li
            key={mod}
            className="inline-flex items-center gap-1 whitespace-nowrap text-muted-foreground"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: baseModColors[mod] }}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">{mod}</span>
            <span className="tabular-nums">
              {formatModPercentage(percentage)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatModPercentage(percentage: number): string {
  return `${percentage < 10 ? percentage.toFixed(1) : Math.round(percentage)}%`;
}

function Metric({
  icon,
  value,
  unit,
  ariaLabel,
  testId,
}: {
  icon: ReactNode;
  value: ReactNode;
  unit?: string;
  ariaLabel?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      aria-label={ariaLabel}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-muted-foreground"
    >
      {icon}
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      {unit ? <span className="text-[11px] sm:text-xs">{unit}</span> : null}
    </span>
  );
}
