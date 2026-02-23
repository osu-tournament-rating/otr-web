'use client';

import { Users } from 'lucide-react';

import type { TournamentSearchResult } from '@/lib/orpc/schema/search';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
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
    <div className="flex w-full items-center gap-3">
      <VerificationBadge
        verificationStatus={data.verificationStatus}
        rejectionReason={data.rejectionReason}
        entityType="tournament"
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {highlightMatch(data.name, query)}
      </span>

      <div className="flex flex-shrink-0 items-center gap-3">
        <LazerBadge isLazer={data.isLazer} />
        <div className="flex items-center gap-1">
          <Users className="text-primary h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs">
            {data.lobbySize}v{data.lobbySize}
          </span>
        </div>
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
      </div>
    </div>
  );
}
