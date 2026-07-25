'use client';

import { Gamepad2, Star } from 'lucide-react';

import { RulesetEnumHelper } from '@/lib/enum-helpers';
import type { BeatmapSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import BeatmapBackground from '@/components/games/BeatmapBackground';

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
    <div className="flex w-full items-center gap-3 overflow-hidden">
      <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
        <BeatmapBackground
          beatmapsetId={data.beatmapsetOsuId ?? undefined}
          alt={`${displayTitle} cover`}
          className="absolute inset-0 h-full w-full object-cover"
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

      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">{data.sr.toFixed(2)}</span>
        </div>
        <SimpleTooltip
          content={RulesetEnumHelper.getMetadata(data.ruleset).text}
        >
          <RulesetIcon
            ruleset={data.ruleset}
            width={16}
            height={16}
            className="flex-shrink-0 fill-primary"
          />
        </SimpleTooltip>
        {data.gameCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Gamepad2 className="h-3 w-3" />
            <span>{data.gameCount.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
