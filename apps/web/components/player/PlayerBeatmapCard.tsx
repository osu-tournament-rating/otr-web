import { Star } from 'lucide-react';

import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import { RulesetName } from '@/components/kit/format/RulesetName';
import { RowListItem } from '@/components/kit/layout/RowList';
import { Badge } from '@/components/kit/status/Badge';
import { getBeatmapDisplayRuleset } from '@/lib/beatmaps/presentation';
import {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '@/lib/kit/color/star-rating';
import { formatCountOf, formatNumber } from '@/lib/kit/format/number';
import type { PlayerBeatmapStats } from '@/lib/orpc/schema/playerBeatmaps';
import { formatDuration } from '@/lib/utils/date';

/**
 * One beatmap the player mapped that was pooled in a tournament. The whole
 * row opens the beatmap, as the beatmap list's rows do.
 */
export default function PlayerBeatmapCard({
  beatmap,
}: {
  beatmap: PlayerBeatmapStats;
}) {
  const ruleset = getBeatmapDisplayRuleset(beatmap.ruleset, beatmap.diffName);

  return (
    <RowListItem
      data-testid={`player-beatmap-card-${beatmap.osuId}`}
      href={`/beatmaps/${beatmap.osuId}`}
      linkLabel={`View ${beatmap.artist} - ${beatmap.title} [${beatmap.diffName}]`}
      leading={
        <BeatmapCover
          beatmapsetOsuId={beatmap.beatmapsetId}
          alt=""
          variant="card"
          sizes="96px"
          className="h-12 w-20 rounded-md sm:h-14 sm:w-24"
        />
      }
      title={
        // The difficulty drops to its own line when the row is too narrow,
        // so a phone still shows it instead of cutting it off.
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
          <span className="max-w-full truncate" title={beatmap.title}>
            {beatmap.title}
          </span>
          <span
            className="max-w-full truncate text-sm text-muted-foreground"
            title={beatmap.diffName}
          >
            [{beatmap.diffName}]
          </span>
        </span>
      }
      description={<span className="block truncate">{beatmap.artist}</span>}
    >
      <div
        data-testid="player-beatmap-metrics"
        className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
      >
        <Badge
          data-testid="player-beatmap-star-rating"
          size="sm"
          customColor={{
            background: getStarRatingColor(beatmap.sr),
            foreground: getStarRatingForegroundColor(beatmap.sr),
          }}
          className="tabular-nums"
        >
          <Star aria-hidden className="fill-current" />
          {formatNumber(beatmap.sr, { decimals: 2 })}
        </Badge>
        <RulesetName ruleset={ruleset} />
        <span className="tabular-nums">
          {formatNumber(beatmap.bpm, { decimals: 0 })} BPM
        </span>
        <span className="tabular-nums">
          {formatDuration(beatmap.totalLength)}
        </span>
        <span className="tabular-nums">
          {formatCountOf(beatmap.gameCount, 'verified game')}
        </span>
        <span className="tabular-nums">
          {formatCountOf(beatmap.tournamentCount, 'tournament')}
        </span>
      </div>
    </RowListItem>
  );
}
