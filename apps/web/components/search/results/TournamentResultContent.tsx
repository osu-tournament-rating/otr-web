'use client';

import { Users } from 'lucide-react';

import type { TournamentSearchResult } from '@/lib/orpc/schema/search';
import { RulesetEnumHelper } from '@/lib/enums';
import { highlightMatch } from '@/lib/utils/search';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { LazerBadge } from '@/components/badges/LazerBadge';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';

interface TournamentResultContentProps {
  data: TournamentSearchResult;
  query: string;
}

export function TournamentResultContent({
  data,
  query,
}: TournamentResultContentProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="bg-muted/50 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10">
          <VerificationBadge
            verificationStatus={data.verificationStatus}
            rejectionReason={data.rejectionReason}
            entityType="tournament"
          />
        </div>
        <span className="min-w-0 truncate text-base font-medium sm:text-lg">
          {highlightMatch(data.name, query)}
        </span>
      </div>

      <div className="ml-10 flex flex-shrink items-center gap-3 sm:ml-0 sm:gap-4">
        <LazerBadge isLazer={data.isLazer} />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Users className="text-primary h-4 w-4 flex-shrink-0 sm:h-4 sm:w-4" />
          <span className="text-xs font-medium sm:text-sm">
            {data.lobbySize}v{data.lobbySize}
          </span>
        </div>

        <SimpleTooltip
          content={RulesetEnumHelper.getMetadata(data.ruleset).text}
        >
          <RulesetIcon
            ruleset={data.ruleset}
            width={20}
            height={20}
            className="fill-primary flex-shrink-0 sm:h-5 sm:w-5"
          />
        </SimpleTooltip>
      </div>
    </div>
  );
}
