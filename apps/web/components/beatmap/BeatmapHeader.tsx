'use client';

import { Music2, Star, UserRound } from 'lucide-react';
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
  verifiedPoolCount: number;
}

export default function BeatmapHeader({
  beatmap,
  relatedDifficulties,
  summary,
  verifiedPoolCount,
}: BeatmapHeaderProps) {
  const creators = Array.from(
    new Map(
      [
        ...(beatmap.beatmapset?.creator ? [beatmap.beatmapset.creator] : []),
        ...beatmap.creators,
      ].map((creator) => [creator.id, creator] as const)
    ).values()
  );
  const artist = beatmap.beatmapset?.artist ?? 'Unknown artist';
  const title = beatmap.beatmapset?.title ?? 'Unknown title';

  return (
    <header
      data-testid="beatmap-header"
      className="overflow-hidden rounded-xl border bg-card shadow-sm dark:shadow-none"
    >
      <div
        data-testid="beatmap-artwork-strip"
        className="group relative isolate h-48 overflow-hidden bg-muted sm:h-56"
      >
        <BeatmapCover
          beatmapsetOsuId={beatmap.beatmapset?.osuId}
          alt={`${artist} - ${title} cover`}
          sizes="(max-width: 1050px) 100vw, 1050px"
          priority
          className="absolute inset-0"
          imageClassName="scale-[1.01] saturate-75 transition-transform duration-700 group-hover:scale-[1.035]"
        />
        <div
          data-testid="beatmap-matte-overlay"
          className="absolute inset-0 bg-black/60"
        />

        <div className="relative z-10 flex h-full items-end p-4 text-white sm:p-6">
          <div className="max-w-4xl min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                {title}
              </h1>
              <p className="text-sm font-semibold text-white/85 sm:text-lg">
                [{beatmap.diffName}]
              </p>
            </div>

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/80">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Music2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{artist}</span>
              </span>
              <span className="inline-flex min-w-0 items-start gap-1.5">
                <UserRound
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                {creators.length > 0 ? (
                  <span className="flex min-w-0 flex-wrap">
                    <span className="mr-1">Mapped by</span>
                    {creators.map((creator, index) => (
                      <span key={creator.id} className="inline-flex">
                        {index > 0 && (
                          <span className="mr-1 text-white/55">,</span>
                        )}
                        <Link
                          href={`/players/${creator.id}`}
                          prefetch={false}
                          className="relative z-20 rounded-sm font-medium text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        >
                          {creator.username}
                        </Link>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span>Unknown mapper</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <BeatmapBannerData
        beatmap={beatmap}
        summary={summary}
        verifiedPoolCount={verifiedPoolCount}
      />

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
      <div
        ref={scrollerRef}
        className="flex snap-x gap-2 overflow-x-auto p-3 sm:px-4"
      >
        {difficulties.map((difficulty) => {
          const isCurrent = difficulty.osuId === currentOsuId;
          const ruleset = getBeatmapDisplayRuleset(
            difficulty.ruleset,
            difficulty.diffName
          );
          const formattedRating = difficulty.sr.toFixed(2);
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
                className="flex min-h-10 max-w-72 min-w-52 snap-start items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-secondary/60 dark:hover:bg-secondary/80"
              >
                {difficultyIcon}
                <span className="min-w-0 flex-1 truncate font-medium">
                  {difficulty.diffName}
                </span>
                <span
                  data-testid="related-difficulty-star-rating"
                  className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold text-foreground tabular-nums"
                >
                  <Star className="size-3.5 fill-current" aria-hidden="true" />
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
                  {difficulty.diffName} · {formattedRating} stars
                </span>
              }
            >
              <Link
                data-testid={`related-difficulty-${difficulty.osuId}`}
                href={`/beatmaps/${difficulty.osuId}`}
                prefetch={false}
                aria-label={accessibleLabel}
                className="flex size-10 shrink-0 snap-start items-center justify-center rounded-lg border bg-background transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/40 dark:hover:bg-secondary/60"
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
