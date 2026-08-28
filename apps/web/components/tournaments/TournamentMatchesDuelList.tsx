'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { MatchRow } from '@/app/tournaments/[id]/columns';
import MatchDuelRow from '@/components/tournaments/MatchDuelRow';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VerificationStatus } from '@otr/core/osu';

type SortKey = 'date' | 'margin' | 'games' | 'name' | 'status';

const sortLabels: Record<SortKey, string> = {
  date: 'Date',
  margin: 'Margin',
  games: 'Games',
  name: 'Name',
  status: 'Status',
};

const statusOrder: Record<VerificationStatus, number> = {
  [VerificationStatus.Rejected]: 0,
  [VerificationStatus.PreRejected]: 1,
  [VerificationStatus.None]: 2,
  [VerificationStatus.PreVerified]: 3,
  [VerificationStatus.Verified]: 4,
};

function margin(match: MatchRow) {
  const record = match.winRecord;
  return record ? record.winnerPoints - record.loserPoints : -1;
}

function compare(a: MatchRow, b: MatchRow, key: SortKey) {
  switch (key) {
    case 'date':
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    case 'margin':
      return margin(a) - margin(b);
    case 'games':
      return a.games.length - b.games.length;
    case 'name':
      return a.name.localeCompare(b.name);
    case 'status':
      return (
        statusOrder[a.status.verificationStatus] -
        statusOrder[b.status.verificationStatus]
      );
  }
}

export default function TournamentMatchesDuelList({
  matches,
  selectedMatchIds,
  onSelectMatch,
}: {
  matches: MatchRow[];
  selectedMatchIds?: Set<number>;
  onSelectMatch?: (matchId: number, checked: boolean) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'date',
    descending: true,
  });

  const sorted = useMemo(() => {
    const rows = [...matches].sort((a, b) => compare(a, b, sort.key));
    return sort.descending ? rows.reverse() : rows;
  }, [matches, sort]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Sort by</span>
        {(Object.keys(sortLabels) as SortKey[]).map((key) => {
          const active = sort.key === key;

          return (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={cn('h-7 px-2 text-xs', active && 'bg-muted')}
              onClick={() =>
                setSort((current) =>
                  current.key === key
                    ? { key, descending: !current.descending }
                    : { key, descending: true }
                )
              }
            >
              {sortLabels[key]}
              {active &&
                (sort.descending ? (
                  <ArrowDown className="ml-1 h-3 w-3" />
                ) : (
                  <ArrowUp className="ml-1 h-3 w-3" />
                ))}
            </Button>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No matches found.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sorted.map((match) => (
            <MatchDuelRow
              key={match.id}
              match={match}
              isSelected={selectedMatchIds?.has(match.id)}
              onSelect={onSelectMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
