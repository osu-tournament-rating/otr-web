'use client';

import {
  Activity,
  ChevronRight,
  Clock3,
  Gamepad2,
  Music2,
  SearchX,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

import AudioPlayButton from '@/components/audio/AudioPlayButton';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import RulesetIcon from '@/components/icons/RulesetIcon';
import type { BeatmapListItem } from '@/lib/orpc/schema/beatmapList';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
} from '@/lib/beatmaps/presentation';
import { formatDuration } from '@/lib/utils/date';

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
          {isFiltered ? 'No beatmaps match' : 'No verified beatmaps yet'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isFiltered ? 'Try fewer filters.' : 'The archive is empty.'}
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
    <div role="list" aria-label="Verified tournament beatmaps">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[14rem_minmax(0,1fr)_17rem] gap-5 border-b bg-muted/30 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid dark:bg-secondary/45"
      >
        <span>Cover</span>
        <span>Beatmap</span>
        <span>Tournament evidence</span>
      </div>

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

          return (
            <article
              key={beatmap.id}
              role="listitem"
              data-testid={`beatmap-list-row-${beatmap.osuId}`}
              className="group relative grid gap-3 p-3 transition-colors hover:bg-muted/35 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-4 sm:p-4 lg:grid-cols-[14rem_minmax(0,1fr)_17rem] lg:items-center lg:gap-5 dark:hover:bg-secondary/60"
            >
              <Link
                href={href}
                prefetch={false}
                aria-label={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
                className="absolute inset-0 z-10 rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset"
              />

              <BeatmapCover
                beatmapsetOsuId={beatmap.beatmapsetOsuId}
                alt={`${beatmap.artist} - ${beatmap.title} cover`}
                sizes="(max-width: 639px) calc(100vw - 2rem), 224px"
                priority={index === 0}
                className="h-32 w-full rounded-lg shadow-sm sm:h-24"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.035]"
              />

              <div className="pointer-events-none absolute top-[5.5rem] right-6 z-20 sm:top-auto sm:right-auto sm:bottom-7 sm:left-[12.25rem] lg:bottom-auto lg:left-[12.25rem]">
                {beatmap.beatmapsetOsuId ? (
                  <span className="pointer-events-auto inline-flex rounded-full bg-black/65 p-1 text-white shadow-lg backdrop-blur-sm">
                    <AudioPlayButton
                      beatmapsetOsuId={beatmap.beatmapsetOsuId}
                      artist={beatmap.artist}
                      title={beatmap.title}
                      difficulty={beatmap.diffName}
                      size="md"
                      variant="ghost"
                      className="rounded-full text-white hover:bg-white/20 hover:text-white"
                    />
                  </span>
                ) : null}
              </div>

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
                    className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary lg:hidden"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <RulesetIcon
                      ruleset={ruleset}
                      className="size-4 shrink-0 fill-current"
                      aria-hidden="true"
                    />
                    {rulesetLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Star className="size-4 text-primary" aria-hidden="true" />
                    {beatmap.sr.toFixed(2)} SR
                    <span className="sr-only">star rating</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Activity className="size-4" aria-hidden="true" />
                    {Math.round(beatmap.bpm)} BPM
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-4" aria-hidden="true" />
                    {formatDuration(Number(beatmap.totalLength))}
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                  Mapped by {beatmap.creator ?? 'Unknown mapper'}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">#{beatmap.osuId}</span>
                </p>

                <div className="mt-3 flex gap-4 border-t pt-3 text-xs sm:hidden">
                  <EvidenceCount
                    icon={Gamepad2}
                    value={beatmap.verifiedGameCount}
                    label="verified games"
                  />
                  <EvidenceCount
                    icon={Trophy}
                    value={beatmap.verifiedTournamentCount}
                    label="verified tournaments"
                  />
                </div>
              </div>

              <div className="hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-1">
                <EvidenceCount
                  icon={Gamepad2}
                  value={beatmap.verifiedGameCount}
                  label="verified games"
                />
                <EvidenceCount
                  icon={Trophy}
                  value={beatmap.verifiedTournamentCount}
                  label="verified tournaments"
                />
                <ChevronRight
                  className="absolute right-4 hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary lg:block"
                  aria-hidden="true"
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceCount({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Music2;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted dark:bg-secondary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>
        <strong className="block text-sm leading-tight font-semibold text-foreground">
          {value.toLocaleString()}
        </strong>
        <span className="whitespace-nowrap">{label}</span>
      </span>
    </span>
  );
}
