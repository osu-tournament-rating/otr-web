'use client';

import { Music2, PencilLine, UserRound } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { Fragment, useEffect, useRef } from 'react';

import { Ruleset } from '@otr/core/osu';

import AudioPreviewButton from '@/components/audio/AudioPreviewButton';
import BeatmapAdminView from '@/components/beatmap/BeatmapAdminView';
import BeatmapBannerData from '@/components/beatmap/BeatmapBannerData';
import { Eyebrow, SectionCard } from '@/components/beatmap/BeatmapSection';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { Separator } from '@/components/ui/separator';
import {
  getBeatmapArtist,
  getBeatmapDisplayRuleset,
  getBeatmapTitle,
} from '@/lib/beatmaps/presentation';
import { getStarRatingIconColor } from '@/lib/beatmaps/star-rating-color';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
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
  const creators = Array.from(
    new Map(
      [
        ...(beatmap.beatmapset?.creator ? [beatmap.beatmapset.creator] : []),
        ...beatmap.creators,
      ].map((creator) => [creator.id, creator] as const)
    ).values()
  );
  const artist = getBeatmapArtist(beatmap) ?? 'Unknown artist';
  const title = getBeatmapTitle(beatmap) ?? 'Unknown title';

  return (
    <SectionCard as="header" data-testid="beatmap-header">
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
          imageClassName="scale-[1.01] saturate-75 transition-transform duration-700 group-hover:scale-[1.0225]"
        />
        <div
          data-testid="beatmap-matte-overlay"
          className="absolute inset-0 bg-black/60"
        />

        <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
          <BeatmapAdminView beatmap={beatmap} />
        </div>

        <div className="absolute right-4 bottom-4 z-20 sm:right-6 sm:bottom-6">
          <AudioPreviewButton
            beatmapsetOsuId={beatmap.beatmapset?.osuId}
            artist={artist}
            title={title}
            difficulty={beatmap.diffName}
            className="rounded-full border border-white/25 bg-black/55 text-white shadow-lg backdrop-blur-sm hover:bg-black/70 hover:text-white"
          />
        </div>

        <div className="relative z-10 flex h-full items-end p-4 pr-28 text-white sm:p-6 sm:pr-32">
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
              {beatmap.manualOverride && (
                <SimpleTooltip content="Set by an admin because the osu! API no longer serves this beatmap">
                  <span className="inline-flex items-center gap-1.5">
                    <PencilLine
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    Manually configured
                  </span>
                </SimpleTooltip>
              )}
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

      <BeatmapBannerData beatmap={beatmap} />

      <DifficultyNavigator
        currentOsuId={beatmap.osuId}
        difficulties={relatedDifficulties}
      />
    </SectionCard>
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
    if (!scroller) return;

    let cancelled = false;
    const centerActiveDifficulty = () => {
      const activeDifficulty = scroller.querySelector<HTMLElement>(
        '[aria-current="page"]'
      );
      if (cancelled || !activeDifficulty) return;

      const scrollerBounds = scroller.getBoundingClientRect();
      const activeBounds = activeDifficulty.getBoundingClientRect();
      const activeStart =
        scroller.scrollLeft + activeBounds.left - scrollerBounds.left;

      scroller.scrollLeft =
        activeStart + activeBounds.width <= scroller.clientWidth
          ? 0
          : activeStart - (scroller.clientWidth - activeBounds.width) / 2;
    };

    // Wait for real font metrics before centring.
    void document.fonts.ready.then(centerActiveDifficulty);

    return () => {
      cancelled = true;
    };
  }, [currentOsuId, difficulties.length]);

  if (difficulties.length < 2) return null;

  const difficultyGroups = Array.from(
    difficulties
      .reduce((groups, difficulty) => {
        const ruleset = getBeatmapDisplayRuleset(
          difficulty.ruleset,
          difficulty.diffName
        );
        const group = groups.get(ruleset) ?? [];
        group.push(difficulty);
        return groups.set(ruleset, group);
      }, new Map<Ruleset, RelatedBeatmapDifficulty[]>())
      .entries()
  ).sort(([rulesetA], [rulesetB]) => rulesetA - rulesetB);

  const showGroupLabels = difficultyGroups.length > 1;

  const renderDifficulty = (difficulty: RelatedBeatmapDifficulty) => {
    const isCurrent = difficulty.osuId === currentOsuId;
    const ruleset = getBeatmapDisplayRuleset(
      difficulty.ruleset,
      difficulty.diffName
    );
    const formattedRating = difficulty.sr.toFixed(2);
    const accessibleLabel = `${difficulty.diffName}, ${formattedRating} star rating`;
    const difficultyIcon = (
      <RulesetIcon
        ruleset={ruleset}
        className="size-5 shrink-0 fill-current [&_path]:fill-current"
        style={{ color: getStarRatingIconColor(difficulty.sr) }}
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
          className="flex min-h-10 max-w-72 shrink-0 snap-start items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-secondary/60 dark:hover:bg-secondary/80"
        >
          {difficultyIcon}
          <span className="min-w-0 flex-1 truncate font-medium">
            {difficulty.diffName}
          </span>
        </Link>
      );
    }

    return (
      <SimpleTooltip
        key={difficulty.osuId}
        content={
          <div className="max-w-64 space-y-1.5 py-0.5">
            <div className="flex items-start gap-2">
              {difficultyIcon}
              <StarRatingPill
                starRating={difficulty.sr}
                size="sm"
                className="shrink-0 sm:text-xs"
                testId={`difficulty-tooltip-star-rating-${difficulty.osuId}`}
              />
              <span className="text-sm leading-tight font-medium">
                {difficulty.diffName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDifficultyUsage(difficulty)}
            </p>
          </div>
        }
      >
        <Link
          data-testid={`related-difficulty-${difficulty.osuId}`}
          href={`/beatmaps/${difficulty.osuId}`}
          prefetch={false}
          aria-label={accessibleLabel}
          className="flex min-h-10 max-w-64 shrink-0 snap-start items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:size-10 sm:max-w-none sm:justify-center sm:gap-0 sm:px-0 sm:py-0 dark:bg-input/40 dark:hover:bg-secondary/60"
        >
          {difficultyIcon}
          <span className="min-w-0 truncate font-medium sm:hidden">
            {difficulty.diffName}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground sm:hidden">
            {formattedRating} SR
          </span>
        </Link>
      </SimpleTooltip>
    );
  };

  return (
    <nav aria-label="Beatmapset difficulties" className="border-t">
      <div
        ref={scrollerRef}
        className="flex snap-x scroll-pl-4 gap-2 overflow-x-auto p-4 pt-3"
      >
        {difficultyGroups.map(([ruleset, groupDifficulties], groupIndex) => (
          <Fragment key={ruleset}>
            {groupIndex > 0 && (
              <Separator
                orientation="vertical"
                // Separator's `h-full` resolves to 0 in this self-centred flex row.
                className="mx-1 self-center data-[orientation=vertical]:h-6"
              />
            )}
            {showGroupLabels && (
              <Eyebrow className="snap-start self-center whitespace-nowrap">
                {getRulesetGroupLabel(ruleset)}
              </Eyebrow>
            )}
            {groupDifficulties.map(renderDifficulty)}
          </Fragment>
        ))}
      </div>
    </nav>
  );
}

/** Group headers drop the "(other)" mania qualifier. */
function getRulesetGroupLabel(ruleset: Ruleset): string {
  return ruleset === Ruleset.ManiaOther
    ? 'osu!mania'
    : RulesetEnumHelper.getMetadata(ruleset).text;
}

function formatDifficultyUsage({
  pooledTournamentCount,
  verifiedGameCount,
}: RelatedBeatmapDifficulty): string {
  if (pooledTournamentCount === 0 && verifiedGameCount === 0) {
    return 'Not used in a tournament';
  }

  const mappools = pooledTournamentCount === 1 ? 'mappool' : 'mappools';
  const games = verifiedGameCount === 1 ? 'game' : 'games';

  return `${pooledTournamentCount} ${mappools} · ${verifiedGameCount} ${games}`;
}
