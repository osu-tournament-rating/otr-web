'use client';

import { Gamepad2, Star } from 'lucide-react';

import BeatmapBackground from '@/components/games/BeatmapBackground';
import { getStarRatingMarkColor } from '@/lib/kit/color/star-rating';
import { formatCount, formatNumber } from '@/lib/kit/format/number';
import type { BeatmapSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';

import { RulesetLabel } from './RulesetLabel';

interface BeatmapResultContentProps {
  data: BeatmapSearchResult;
  query: string;
}

export function BeatmapResultContent({
  data,
  query,
}: BeatmapResultContentProps) {
  const displayTitle = `${data.artist} - ${data.title}`;

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className="relative size-8 shrink-0 overflow-hidden rounded">
        <BeatmapBackground
          beatmapsetId={data.beatmapsetOsuId ?? undefined}
          alt={`${displayTitle} cover`}
          className="absolute inset-0 size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="min-w-0 truncate font-medium">
          {highlightMatch(displayTitle, query)}
        </span>
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          [{highlightMatch(data.diffName, query)}]
          {data.creator && ` by ${data.creator}`}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums">
        <span className="flex items-center gap-1 font-medium">
          <Star
            aria-hidden
            className="size-3.5 shrink-0"
            style={{ color: getStarRatingMarkColor(data.sr) }}
          />
          <span className="sr-only">Star rating </span>
          {formatNumber(data.sr, { decimals: 2 })}
        </span>
        <RulesetLabel ruleset={data.ruleset} />
        {data.gameCount > 0 ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Gamepad2 aria-hidden className="size-3.5 shrink-0" />
            {formatCount(data.gameCount)}
            <span className="sr-only"> games</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
