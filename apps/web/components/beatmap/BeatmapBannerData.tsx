import { formatSecondsToMinutesSeconds } from '@otr/core/utils/time';
import { Activity, Clock3, ExternalLink, Star } from 'lucide-react';
import Link from 'next/link';

import AudioPreviewButton from '@/components/audio/AudioPreviewButton';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import {
  getBeatmapDisplayRuleset,
  getBeatmapRulesetLabel,
} from '@/lib/beatmaps/presentation';
import {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '@/lib/beatmaps/star-rating-color';
import type { BeatmapWithDetails } from '@/lib/orpc/schema/beatmapStats';

export default function BeatmapBannerData({
  beatmap,
}: {
  beatmap: BeatmapWithDetails;
}) {
  const displayRuleset = getBeatmapDisplayRuleset(
    beatmap.ruleset,
    beatmap.diffName
  );
  const rulesetLabel = getBeatmapRulesetLabel(
    beatmap.ruleset,
    beatmap.diffName
  );
  return (
    <div
      data-testid="beatmap-data-matte"
      className="bg-card text-card-foreground"
    >
      <div
        aria-label="Beatmap essentials"
        className="flex flex-wrap items-center gap-2 p-3.5 sm:gap-2.5 sm:p-4"
      >
        <span className="inline-flex h-8 items-center gap-1.5 px-1 text-sm font-medium text-muted-foreground">
          <RulesetIcon
            ruleset={displayRuleset}
            className="size-4 fill-current"
            aria-hidden="true"
          />
          <span className="text-foreground">{rulesetLabel}</span>
        </span>
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-bold"
          style={{
            backgroundColor: getStarRatingColor(beatmap.sr),
            color: getStarRatingForegroundColor(beatmap.sr),
          }}
          aria-label={`${beatmap.sr.toFixed(2)} star rating`}
        >
          <Star className="size-4 fill-current" aria-hidden="true" />
          {beatmap.sr.toFixed(2)}
        </span>
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
