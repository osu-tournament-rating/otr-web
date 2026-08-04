import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';
import { Activity, Clock3, ExternalLink } from 'lucide-react';
import Link from 'next/link';

import AudioPreviewButton from '@/components/audio/AudioPreviewButton';
import RulesetPill from '@/components/beatmaps/RulesetPill';
import StarRatingPill from '@/components/beatmaps/StarRatingPill';
import { Button } from '@/components/ui/button';
import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';

export default function BeatmapBannerData({
  beatmap,
}: {
  beatmap: BeatmapWithDetails;
}) {
  return (
    <div
      data-testid="beatmap-data-matte"
      className="bg-card text-card-foreground"
    >
      <div
        aria-label="Beatmap essentials"
        className="flex flex-wrap items-center gap-2 p-3.5 sm:gap-2.5 sm:p-4"
      >
        <RulesetPill
          ruleset={beatmap.ruleset}
          diffName={beatmap.diffName}
          size="md"
        />
        <StarRatingPill
          starRating={beatmap.sr}
          size="md"
          valueClassName="font-bold"
        />
        <span className="inline-flex h-8 items-center gap-1.5 px-1 text-sm font-semibold tabular-nums">
          <Activity
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          {Math.round(beatmap.bpm)} BPM
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 px-1 text-sm font-semibold tabular-nums">
          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
          {formatSecondsToMinutesSeconds(beatmap.totalLength)}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AudioPreviewButton
            beatmapsetOsuId={beatmap.beatmapset?.osuId}
            artist={beatmap.beatmapset?.artist}
            title={beatmap.beatmapset?.title}
            difficulty={beatmap.diffName}
            className="bg-muted text-foreground shadow-none hover:bg-muted/70"
          />
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-9 bg-card shadow-none"
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
      </div>
    </div>
  );
}
