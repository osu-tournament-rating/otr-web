'use client';

import { Globe } from 'lucide-react';

import { RulesetEnumHelper } from '@/lib/enums';
import type { PlayerSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';
import { TierName } from '@/lib/utils/tierData';
import RulesetIcon from '@/components/icons/RulesetIcon';
import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import TRText from '@/components/rating/TRText';

interface PlayerResultContentProps {
  data: PlayerSearchResult;
  query: string;
}

export function PlayerResultContent({ data, query }: PlayerResultContentProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <OsuAvatar
        osuId={data.osuId}
        username={data.username}
        size={24}
        className="flex-shrink-0"
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {highlightMatch(data.username ?? 'Unknown user', query)}
      </span>

      <div className="flex flex-shrink-0 items-center gap-3">
        {data.rating && data.tierProgress && (
          <div className="flex items-center gap-1">
            <TierIcon
              tier={data.tierProgress.currentTier as TierName}
              subTier={data.tierProgress.currentSubTier ?? undefined}
              width={16}
              height={16}
            />
            <span className="flex items-baseline gap-0.5 text-xs font-medium">
              {data.rating.toFixed(0)}
              <TRText />
            </span>
          </div>
        )}

        {!!data.globalRank && (
          <div className="flex items-center gap-1">
            <Globe className="text-primary h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs">#{data.globalRank.toLocaleString()}</span>
          </div>
        )}

        {(data.ruleset || data.ruleset === 0) && (
          <SimpleTooltip
            content={RulesetEnumHelper.getMetadata(data.ruleset).text}
          >
            <RulesetIcon
              ruleset={data.ruleset}
              width={16}
              height={16}
              className="fill-primary flex-shrink-0"
            />
          </SimpleTooltip>
        )}
      </div>
    </div>
  );
}
