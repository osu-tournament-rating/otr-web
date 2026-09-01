'use client';

import { useMemo, useState } from 'react';

import { getVerificationStatusPriority, type MatchRow } from './matchRow';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatUTCDateRange, playWeekKey } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import MatchLedgerRow from './MatchLedgerRow';

type SortKey = 'newest' | 'oldest' | 'name' | 'games' | 'closest' | 'status';

const sortLabels: Record<SortKey, string> = {
  newest: 'Date, newest first',
  oldest: 'Date, oldest first',
  name: 'Match name',
  games: 'Games played',
  closest: 'Closest result',
  status: 'Verification status',
};

const startedAt = (match: MatchRow) =>
  match.startDate ? new Date(match.startDate).getTime() : 0;

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
    const byWeek = new Map<number, MatchRow[]>();
    const undated: MatchRow[] = [];

    for (const match of sorted) {
      if (!match.startDate) {
        undated.push(match);
        continue;
      }

      const week = playWeekKey(new Date(match.startDate));
      const weekMatches = byWeek.get(week);
      if (weekMatches) {
        weekMatches.push(match);
      } else {
        byWeek.set(week, [match]);
      }
    }

    const weeks = [...byWeek]
      .sort(([a], [b]) => (sort === 'oldest' ? a - b : b - a))
      .map(([week, weekMatches]) => {
        const times = weekMatches.map(startedAt);

        return {
          key: String(week),
          label: formatUTCDateRange(
            new Date(Math.min(...times)),
            new Date(Math.max(...times))
          ),
          matches: weekMatches,
        };
      });

    if (undated.length) {
      weeks.push({ key: 'undated', label: 'No start time', matches: undated });
    }

    return weeks;
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
            <section key={group.key}>
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
                    aria-label={`Select matches from ${group.label}`}
                  />
                )}
                <span className="text-sm font-semibold">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  · {group.matches.length}{' '}
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
