'use client';

import { Music2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import BeatmapBannerData from '@/components/beatmap/BeatmapBannerData';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { getBeatmapDisplayRuleset } from '@/lib/beatmaps/presentation';
import { getStarRatingColor } from '@/lib/beatmaps/star-rating-color';
import type {
  BeatmapStatsSummary,
  BeatmapWithDetails,
  RelatedBeatmapDifficulty,
} from '@/lib/orpc/schema/beatmapStats';

interface BeatmapHeaderProps {
  beatmap: BeatmapWithDetails;
  relatedDifficulties: RelatedBeatmapDifficulty[];
  summary: BeatmapStatsSummary;
}

export default function BeatmapHeader({
  beatmap,
  relatedDifficulties,
  summary,
}: BeatmapHeaderProps) {
  const creator = beatmap.creators?.[0] ?? beatmap.beatmapset?.creator;
  const artist = beatmap.beatmapset?.artist ?? 'Unknown artist';
  const title = beatmap.beatmapset?.title ?? 'Unknown title';

  return (
    <header
      data-testid="beatmap-header"
      className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none"
    >
      <div className="group relative isolate min-h-[34rem] overflow-hidden bg-muted sm:min-h-[31rem]">
        <BeatmapCover
          beatmapsetOsuId={beatmap.beatmapset?.osuId}
          alt={`${artist} - ${title} cover`}
          sizes="(max-width: 1050px) 100vw, 1050px"
          priority
          className="absolute inset-0"
          imageClassName="scale-[1.02] transition-transform duration-1000 group-hover:scale-[1.055]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-black/20" />

        <div className="relative z-10 flex min-h-[34rem] flex-col p-4 text-white sm:min-h-[31rem] sm:p-6">
          <div className="mt-auto">
            <div className="max-w-3xl">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance drop-shadow-md sm:text-4xl">
                  {title}
                </h1>
                <p className="text-base font-semibold text-white/90 sm:text-lg">
                  [{beatmap.diffName}]
                </p>
              </div>

              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/75">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Music2 className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{artist}</span>
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
            </div>

            <BeatmapBannerData beatmap={beatmap} summary={summary} />
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
