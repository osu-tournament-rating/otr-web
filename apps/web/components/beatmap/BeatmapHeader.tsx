'use client';

import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';
import {
  Activity,
  ArrowLeft,
  Clock3,
  ExternalLink,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import AudioPreviewButton from '@/components/audio/AudioPreviewButton';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import RulesetIcon from '@/components/icons/RulesetIcon';
import StarRatingIcon from '@/components/icons/StarRatingIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
} from '@/lib/beatmaps/presentation';
import { getStarRatingColor } from '@/lib/beatmaps/star-rating-color';
import type {
  BeatmapWithDetails,
  RelatedBeatmapDifficulty,
} from '@/lib/orpc/schema/beatmapStats';

interface BeatmapHeaderProps {
  beatmap: BeatmapWithDetails;
  relatedDifficulties: RelatedBeatmapDifficulty[];
}

export default function BeatmapHeader({
  beatmap,
  relatedDifficulties,
}: BeatmapHeaderProps) {
  const creator = beatmap.creators?.[0] ?? beatmap.beatmapset?.creator;
  const displayRuleset = getBeatmapDisplayRuleset(
    beatmap.ruleset,
    beatmap.diffName
  );
  const rulesetLabel = getBeatmapRulesetLabel(
    beatmap.ruleset,
    beatmap.diffName
  );
  const title = `${beatmap.beatmapset?.artist ?? 'Unknown artist'} – ${
    beatmap.beatmapset?.title ?? 'Unknown title'
  }`;

  return (
    <header className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="group relative isolate min-h-[22rem] overflow-hidden bg-muted sm:min-h-[25rem]">
        <BeatmapCover
          beatmapsetOsuId={beatmap.beatmapset?.osuId}
          alt={`${title} cover`}
          sizes="(max-width: 1050px) 100vw, 1050px"
          priority
          className="absolute inset-0"
          imageClassName="scale-[1.02] transition-transform duration-1000 group-hover:scale-[1.055]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-transparent" />

        <div className="relative z-10 flex min-h-[22rem] flex-col justify-between p-4 text-white sm:min-h-[25rem] sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="border border-white/15 bg-black/45 text-white shadow-none backdrop-blur-md hover:bg-black/65 hover:text-white"
            >
              <Link href="/beatmaps">
                <ArrowLeft aria-hidden="true" />
                Beatmaps
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="icon"
              className="border border-white/15 bg-black/45 text-white shadow-none backdrop-blur-md hover:bg-black/65 hover:text-white"
            >
              <Link
                data-testid="beatmap-external-link"
                href={`https://osu.ppy.sh/beatmaps/${beatmap.osuId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View beatmap on osu!"
              >
                <ExternalLink aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="max-w-3xl">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
              <RulesetIcon
                ruleset={displayRuleset}
                className="size-4 fill-current"
                aria-hidden="true"
              />
              {rulesetLabel}
            </p>
            <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance drop-shadow-md sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-base font-semibold text-white/90 sm:text-lg">
              [{beatmap.diffName}]
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                <StarRatingIcon
                  starRating={beatmap.sr}
                  className="size-4"
                  aria-hidden="true"
                />
                {beatmap.sr.toFixed(2)} SR
                <span className="sr-only">star rating</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="size-4" aria-hidden="true" />
                {Math.round(beatmap.bpm)} BPM
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" aria-hidden="true" />
                {formatSecondsToMinutesSeconds(beatmap.totalLength)}
              </span>
              {creator && (
                <Link
                  href={`/players/${creator.id}`}
                  prefetch={false}
                  className="relative z-20 inline-flex items-center gap-1.5 rounded-sm hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                  {creator.username}
                </Link>
              )}
              {!creator && (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="size-4" aria-hidden="true" />
                  Unknown mapper
                </span>
              )}
            </div>

            <div className="mt-5">
              <AudioPreviewButton
                beatmapsetOsuId={beatmap.beatmapset?.osuId}
                artist={beatmap.beatmapset?.artist}
                title={beatmap.beatmapset?.title}
                difficulty={beatmap.diffName}
                className="border border-white/15 bg-white text-black hover:bg-white/90"
              />
            </div>
          </div>
        </div>
      </div>

      <DifficultyNavigator
        currentOsuId={beatmap.osuId}
        difficulties={relatedDifficulties}
      />
    </header>
  );
}

function DifficultyNavigator({
  currentOsuId,
  difficulties,
}: {
  currentOsuId: number;
  difficulties: RelatedBeatmapDifficulty[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeDifficulty = scroller?.querySelector<HTMLElement>(
      '[aria-current="page"]'
    );

    if (!scroller || !activeDifficulty) return;

    const scrollerBounds = scroller.getBoundingClientRect();
    const activeBounds = activeDifficulty.getBoundingClientRect();
    scroller.scrollLeft +=
      activeBounds.left -
      scrollerBounds.left -
      (scrollerBounds.width - activeBounds.width) / 2;
  }, [currentOsuId, difficulties.length]);

  if (difficulties.length === 0) return null;

  return (
    <nav aria-label="Beatmapset difficulties" className="border-t">
      <div className="flex items-center gap-3 px-4 pt-3 sm:px-5">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Difficulties
        </span>
        <span className="text-xs text-muted-foreground">
          {difficulties.length} in set
        </span>
      </div>
      <div
        ref={scrollerRef}
        className="flex snap-x gap-2 overflow-x-auto px-4 pt-2 pb-4 sm:px-5"
      >
        {difficulties.map((difficulty) => {
          const isCurrent = difficulty.osuId === currentOsuId;
          const ruleset = getBeatmapDisplayRuleset(
            difficulty.ruleset,
            difficulty.diffName
          );
          const formattedRating = `${difficulty.sr.toFixed(2)} SR`;
          const accessibleLabel = `${difficulty.diffName}, ${difficulty.sr.toFixed(2)} star rating`;
          const difficultyIcon = (
            <RulesetIcon
              ruleset={ruleset}
              className="size-5 shrink-0 fill-current [&_path]:fill-current"
              style={{ color: getStarRatingColor(difficulty.sr) }}
              aria-hidden="true"
            />
          );

          if (isCurrent) {
            return (
              <Link
                key={difficulty.osuId}
                data-testid={`related-difficulty-${difficulty.osuId}`}
                href={`/beatmaps/${difficulty.osuId}`}
                prefetch={false}
                aria-current="page"
                aria-label={accessibleLabel}
                className="flex min-h-10 max-w-64 min-w-40 snap-start items-center gap-2 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-sm transition-colors hover:bg-primary/15 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-primary/15 dark:hover:bg-primary/20"
              >
                {difficultyIcon}
                <span className="min-w-0 flex-1 truncate font-medium">
                  {difficulty.diffName}
                </span>
                <span
                  data-testid="related-difficulty-star-rating"
                  className="shrink-0 font-mono text-xs font-semibold text-foreground"
                >
                  {formattedRating}
                </span>
              </Link>
            );
          }

          return (
            <SimpleTooltip
              key={difficulty.osuId}
              content={
                <span>
                  {difficulty.diffName} · {formattedRating}
                </span>
              }
            >
              <Link
                data-testid={`related-difficulty-${difficulty.osuId}`}
                href={`/beatmaps/${difficulty.osuId}`}
                prefetch={false}
                aria-label={accessibleLabel}
                className="flex size-10 shrink-0 snap-start items-center justify-center rounded-lg border bg-background transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/40"
              >
                {difficultyIcon}
              </Link>
            </SimpleTooltip>
          );
        })}
      </div>
    </nav>
  );
}
