'use client';

import { useMemo, useState } from 'react';
import { Rows3 } from 'lucide-react';

import { VerificationStatus } from '@otr/core/osu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import MatchScoreboardCard, {
  type MatchScoreboardRow,
} from './MatchScoreboardCard';

const sortOptions = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  closest: 'Closest result',
  margin: 'Biggest margin',
  games: 'Most games',
  name: 'Name',
  status: 'Verification status',
} as const;

type SortKey = keyof typeof sortOptions;

const statusPriority = (status: VerificationStatus) => {
  switch (status) {
    case VerificationStatus.Verified:
      return 4;
    case VerificationStatus.PreVerified:
      return 3;
    case VerificationStatus.None:
      return 2;
    case VerificationStatus.PreRejected:
      return 1;
    default:
      return 0;
  }
};

const margin = (match: MatchScoreboardRow) =>
  match.winRecord
    ? match.winRecord.winnerPoints - match.winRecord.loserPoints
    : null;

function compare(a: MatchScoreboardRow, b: MatchScoreboardRow, sort: SortKey) {
  switch (sort) {
    case 'oldest':
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    case 'closest':
    case 'margin': {
      const marginA = margin(a);
      const marginB = margin(b);

      if (marginA === null || marginB === null) {
        return (marginA === null ? 1 : 0) - (marginB === null ? 1 : 0);
      }

      return sort === 'closest' ? marginA - marginB : marginB - marginA;
    }
    case 'games':
      return b.games.length - a.games.length;
    case 'name':
      return a.name.localeCompare(b.name);
    case 'status':
      return (
        statusPriority(b.status.verificationStatus) -
        statusPriority(a.status.verificationStatus)
      );
    default:
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
  }
}

interface TournamentMatchGridProps {
  matches: MatchScoreboardRow[];
  selectedMatchIds?: Set<number>;
  onSelectMatch?: (matchId: number, checked: boolean) => void;
}

export default function TournamentMatchGrid({
  matches,
  selectedMatchIds,
  onSelectMatch,
}: TournamentMatchGridProps) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [compact, setCompact] = useState(false);

  const sorted = useMemo(
    () => [...matches].sort((a, b) => compare(a, b, sort)),
    [matches, sort]
  );

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        No matches found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as SortKey)}
        >
          <SelectTrigger className="h-8 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortOptions).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Toggle
          size="sm"
          variant="outline"
          pressed={compact}
          onPressedChange={setCompact}
          aria-label="Compact layout"
        >
          <Rows3 className="h-4 w-4" />
          Compact
        </Toggle>
      </div>

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2',
          compact
            ? 'gap-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'gap-3 xl:grid-cols-3'
        )}
      >
        {sorted.map((match) => (
          <MatchScoreboardCard
            key={match.id}
            match={match}
            compact={compact}
            isSelected={selectedMatchIds?.has(match.id)}
            onSelect={onSelectMatch}
          />
        ))}
      </div>
    </div>
  );
}
