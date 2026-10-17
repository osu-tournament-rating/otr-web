'use client';

import { useMemo } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { formatDateRange } from '@/lib/kit/format/date';
import { formatCountOf } from '@/lib/kit/format/number';
import type { SortState } from '@/lib/kit/lists/sort';
import { sortRows, type SortValue } from '@/lib/kit/tables/sort';

import MatchLedgerRow from './MatchLedgerRow';
import {
  getVerificationStatusPriority,
  playWeekKey,
  type MatchRow,
  type MatchSortKey,
} from './matchRow';

export type MatchGroup = {
  key: string;
  /** Null for the single ungrouped list of a non-date sort. */
  label: string | null;
  matches: MatchRow[];
};

const startedAt = (match: MatchRow) =>
  match.startDate ? new Date(match.startDate).getTime() : null;

const SORT_VALUES: Readonly<
  Record<MatchSortKey, (match: MatchRow) => SortValue>
> = {
  date: startedAt,
  name: (match) => match.name,
  games: (match) => match.games.length,
  // A match without a result has no margin and sorts last.
  margin: (match) =>
    match.winRecord
      ? match.winRecord.winnerPoints - match.winRecord.loserPoints
      : null,
  status: (match) =>
    getVerificationStatusPriority(match.status.verificationStatus),
};

/**
 * Sorts matches, grouping them by play week when sorting by date. Ties keep
 * the newest match first.
 */
export function groupMatches(
  matches: MatchRow[],
  sort: SortState<MatchSortKey>
): MatchGroup[] {
  const newestFirst = sortRows(
    matches,
    { key: 'date', direction: 'desc' },
    SORT_VALUES
  );
  const sorted = sortRows(newestFirst, sort, SORT_VALUES);

  if (sort.key !== 'date') {
    return sorted.length ? [{ key: 'all', label: null, matches: sorted }] : [];
  }

  const byWeek = new Map<number, MatchRow[]>();
  const undated: MatchRow[] = [];

  for (const match of sorted) {
    const time = startedAt(match);
    if (time === null) {
      undated.push(match);
      continue;
    }

    const week = playWeekKey(new Date(time));
    const weekMatches = byWeek.get(week);
    if (weekMatches) {
      weekMatches.push(match);
    } else {
      byWeek.set(week, [match]);
    }
  }

  const groups: MatchGroup[] = [...byWeek].map(([week, weekMatches]) => {
    const times = weekMatches.map((match) => startedAt(match) ?? 0);

    return {
      key: String(week),
      label: formatDateRange(Math.min(...times), Math.max(...times)),
      matches: weekMatches,
    };
  });

  if (undated.length) {
    groups.push({ key: 'undated', label: 'No start time', matches: undated });
  }

  return groups;
}

interface TournamentMatchesLedgerProps {
  matches: MatchRow[];
  sort: SortState<MatchSortKey>;
  selectedMatchIds?: Set<number>;
  onSelectMatch?: (matchId: number, checked: boolean) => void;
  onSelectMatches?: (matchIds: number[], checked: boolean) => void;
}

/**
 * The tournament's matches as rows, grouped by play week when sorted by
 * date, each group under a strip that stays in view while it scrolls.
 */
export default function TournamentMatchesLedger({
  matches,
  sort,
  selectedMatchIds,
  onSelectMatch,
  onSelectMatches,
}: TournamentMatchesLedgerProps) {
  const groups = useMemo(() => groupMatches(matches, sort), [matches, sort]);

  return (
    <div>
      {groups.map((group) => {
        const ids = group.matches.map((match) => match.id);
        const selectedCount = selectedMatchIds
          ? ids.filter((id) => selectedMatchIds.has(id)).length
          : 0;

        return (
          <section
            key={group.key}
            aria-label={group.label ?? 'Matches'}
            className="not-first:border-t"
          >
            {group.label !== null && (
              <header className="z-10 flex h-9 items-center gap-3 border-b bg-muted px-4 md:sticky md:top-(--header-height-px)">
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
                <h3 className="text-sm font-medium">{group.label}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCountOf(group.matches.length, 'match', 'matches')}
                </span>
              </header>
            )}
            <ul className="divide-y">
              {group.matches.map((match) => (
                <MatchLedgerRow
                  key={match.id}
                  match={match}
                  isSelected={selectedMatchIds?.has(match.id) ?? false}
                  onSelect={onSelectMatch}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
