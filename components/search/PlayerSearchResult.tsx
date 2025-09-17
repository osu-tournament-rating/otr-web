'use client';

import Link from 'next/link';
import { useContext } from 'react';
import { Globe, User } from 'lucide-react';

import { RulesetEnumHelper } from '@/lib/enums';
import type { PlayerSearchResult } from '@/lib/orpc/schema/search';
import { highlightMatch } from '@/lib/utils/search';
import { TierName } from '@/lib/utils/tierData';
import RulesetIcon from '../icons/RulesetIcon';
import TierIcon from '../icons/TierIcon';
import SimpleTooltip from '../simple-tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import TRText from '../rating/TRText';
import { SearchDialogContext } from './SearchDialog';

export default function PlayerSearchResult({
  data,
}: {
  data: PlayerSearchResult;
}) {
  const { query, closeDialog } = useContext(SearchDialogContext);

  // Build the href with ruleset query parameter if available
  const href =
    data.ruleset !== undefined && data.ruleset !== null
      ? `/players/${data.id}?ruleset=${data.ruleset}`
      : `/players/${data.id}`;

  return (
    <Card className="border-none bg-popover p-3 transition-colors hover:bg-popover/80 sm:p-4">
      <Link
        href={href}
        onClick={closeDialog}
        className="flex flex-col gap-2 overflow-hidden sm:flex-row sm:items-center sm:gap-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10">
            <AvatarImage
              src={`https://a.ppy.sh/${data.osuId}`}
              alt={`${data.username || 'Unknown user'}'s profile picture`}
            />
            <AvatarFallback>
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </AvatarFallback>
          </Avatar>
          <p className="min-w-0 text-base font-medium sm:text-lg">
            {highlightMatch(data.username ?? 'Unknown user', query)}
          </p>
        </div>

        <div className="ml-10 flex flex-shrink-0 items-center gap-3 sm:ml-0 sm:gap-4">
          {data.rating && data.tierProgress && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <TierIcon
                tier={data.tierProgress.currentTier as TierName}
                subTier={data.tierProgress.currentSubTier ?? undefined}
                width={20}
                height={20}
                className="flex-shrink-0 sm:h-5 sm:w-5"
              />
              <span className="flex items-baseline gap-1 text-xs font-medium sm:text-sm">
                {data.rating.toFixed(0)}
                <TRText />
              </span>
            </div>
          )}

          {!!data.globalRank && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Globe className="h-4 w-4 flex-shrink-0 text-primary sm:h-4 sm:w-4" />
              <span className="text-xs font-medium sm:text-sm">
                #{data.globalRank.toLocaleString()}
              </span>
            </div>
          )}

          {(data.ruleset || data.ruleset === 0) && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SimpleTooltip
                content={RulesetEnumHelper.getMetadata(data.ruleset).text}
              >
                <RulesetIcon
                  ruleset={data.ruleset}
                  width={20}
                  height={20}
                  className="flex-shrink-0 fill-primary sm:h-5 sm:w-5"
                />
              </SimpleTooltip>
            </div>
          )}
        </div>
      </Link>
    </Card>
  );
}
