'use client';

import { useMemo, useState } from 'react';

import {
  getVerificationStatusPriority,
  type MatchRow,
} from '@/app/tournaments/[id]/columns';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatUTCDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import MatchLedgerRow from './MatchLedgerRow';

type SortKey = 'newest' | 'oldest' | 'name' | 'games' | 'closest' | 'status';

const sortLabels: Record<SortKey, string> = {
  newest: 'Day, newest first',
  oldest: 'Day, oldest first',
  name: 'Match name',
  games: 'Games played',
  closest: 'Closest result',
  status: 'Verification status',
};

const startedAt = (match: MatchRow) => new Date(match.startDate).getTime();

const margin = (match: MatchRow) =>
  match.winRecord
    ? match.winRecord.winnerPoints - match.winRecord.loserPoints
    : Number.POSITIVE_INFINITY;

const comparators: Record<SortKey, (a: MatchRow, b: MatchRow) => number> = {
  newest: (a, b) => startedAt(b) - startedAt(a),
  oldest: (a, b) => startedAt(a) - startedAt(b),
  name: (a, b) => a.name.localeCompare(b.name),
  games: (a, b) => b.games.length - a.games.length,
  closest: (a, b) => margin(a) - margin(b) || startedAt(b) - startedAt(a),
  status: (a, b) =>
    getVerificationStatusPriority(a.status.verificationStatus) -
    getVerificationStatusPriority(b.status.verificationStatus),
};

function dayLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

interface TournamentMatchesLedgerProps {
  matches: MatchRow[];
  selectedMatchIds?: Set<number>;
  onSelectMatch?: (matchId: number, checked: boolean) => void;
  onSelectMatches?: (matchIds: number[], checked: boolean) => void;
}

export default function TournamentMatchesLedger({
  matches,
  selectedMatchIds,
  onSelectMatch,
  onSelectMatches,
}: TournamentMatchesLedgerProps) {
  const [sort, setSort] = useState<SortKey>('newest');

  const groups = useMemo(() => {
    const sorted = [...matches].sort(comparators[sort]);

    if (sort !== 'newest' && sort !== 'oldest') {
      return [{ day: null, matches: sorted }];
    }

    const byDay = new Map<string, MatchRow[]>();

    for (const match of sorted) {
      const day = formatUTCDate(new Date(match.startDate));
      byDay.set(day, [...(byDay.get(day) ?? []), match]);
    }

    return [...byDay].map(([day, dayMatches]) => ({
      day,
      matches: dayMatches,
    }));
  }, [matches, sort]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Sort</span>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as SortKey)}
        >
          <SelectTrigger className="h-8 w-52" aria-label="Sort matches">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        {groups.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No matches found.
          </p>
        )}
        {groups.map((group, index) => {
          const ids = group.matches.map((match) => match.id);
          const selectedCount = selectedMatchIds
            ? ids.filter((id) => selectedMatchIds.has(id)).length
            : 0;

          return (
            <section key={group.day ?? 'all'}>
              <header
                className={cn(
                  'z-10 flex items-center gap-2 border-b bg-muted px-3 py-1.5 md:sticky md:top-(--header-height-px)',
                  index === 0 && 'rounded-t-lg'
                )}
              >
                {onSelectMatches && (
                  <Checkbox
                    checked={
                      selectedCount === 0
                        ? false
                        : selectedCount === ids.length
                          ? true
                          : 'indeterminate'
                    }
                    onCheckedChange={(checked) =>
                      onSelectMatches(ids, checked === true)
                    }
                    aria-label={
                      group.day
                        ? `Select matches on ${dayLabel(group.day)}`
                        : 'Select all matches'
                    }
                  />
                )}
                <span className="text-sm font-semibold">
                  {group.day ? dayLabel(group.day) : sortLabels[sort]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {group.matches.length}{' '}
                  {group.matches.length === 1 ? 'match' : 'matches'}
                </span>
              </header>
              {group.matches.map((match) => (
                <MatchLedgerRow
                  key={match.id}
                  match={match}
                  isSelected={selectedMatchIds?.has(match.id) ?? false}
                  onSelect={onSelectMatch}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
