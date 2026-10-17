'use client';

import { useMemo, useState } from 'react';
import { Check, Download, ListFilter, X } from 'lucide-react';

import { Button } from '@/components/kit/controls/Button';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { Badge } from '@/components/kit/status/Badge';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import {
  SortControl,
  type SortOption,
} from '@/components/kit/lists/SortControl';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { SortableHeader } from '@/components/kit/tables/SortableHeader';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import {
  formatCountOf,
  formatId,
  formatRatingPrecise,
} from '@/lib/kit/format/number';
import type { SortState } from '@/lib/kit/lists/sort';
import { sortRows, type SortValue } from '@/lib/kit/tables/sort';
import type {
  FilteringResult,
  PlayerFilteringResult,
} from '@/lib/orpc/schema/filtering';
import FailureReasonsBadges, {
  getFailureReasons,
} from './FailureReasonsBadges';

type SortKey = 'status' | 'player' | 'osuId' | 'rating';

/** Failed players first, as the results have always opened. */
const DEFAULT_SORT: SortState<SortKey> = { key: 'status', direction: 'asc' };

/** The sortable columns, in header order, for the phone rows' sort strip. */
const SORT_OPTIONS: SortOption<SortKey>[] = [
  {
    value: 'status',
    label: 'Status',
    defaultDirection: 'asc',
    directionLabels: { asc: 'Failed first', desc: 'Passed first' },
  },
  {
    value: 'player',
    label: 'Player',
    defaultDirection: 'asc',
    directionLabels: { asc: 'A to Z', desc: 'Z to A' },
  },
  { value: 'osuId', label: 'osu! ID', defaultDirection: 'asc' },
  {
    value: 'rating',
    label: 'Rating',
    defaultDirection: 'desc',
    directionLabels: { desc: 'Highest first', asc: 'Lowest first' },
  },
];

const SORT_ACCESSORS = {
  status: (row: PlayerFilteringResult) => (row.isSuccess ? 1 : 0),
  player: (row: PlayerFilteringResult) => row.username,
  osuId: (row: PlayerFilteringResult) => row.osuId,
  rating: (row: PlayerFilteringResult) => row.currentRating,
} satisfies Record<SortKey, (row: PlayerFilteringResult) => SortValue>;

function rowKey(row: PlayerFilteringResult, index: number): string {
  return `${row.osuId ?? 'unknown'}-${index}`;
}

function StatusBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <Badge tone="success" size="sm">
      <Check aria-hidden />
      Passed
    </Badge>
  ) : (
    <Badge tone="destructive" size="sm">
      <X aria-hidden />
      Failed
    </Badge>
  );
}

function playerHref(row: PlayerFilteringResult): string | null {
  return row.username && row.playerId && row.osuId !== null
    ? `/players/${row.playerId}`
    : null;
}

/**
 * The player's name as a link, with the 24px avatar inside it unless the
 * row draws its own (`avatar={false}`), or "Unknown" when o!TR has no
 * player.
 */
function PlayerName({
  row,
  avatar = true,
}: {
  row: PlayerFilteringResult;
  avatar?: boolean;
}) {
  const href = playerHref(row);
  if (!href || !row.username || row.osuId === null) {
    return <span className="font-medium text-muted-foreground">Unknown</span>;
  }

  return (
    <EntityLink
      href={href}
      leading={
        avatar ? (
          <OsuAvatar osuId={row.osuId} username={row.username} size={24} />
        ) : undefined
      }
    >
      {row.username}
    </EntityLink>
  );
}

/** A phone row's 32px avatar, or a blank disc for a player o!TR doesn't know. */
function PhoneAvatar({ row }: { row: PlayerFilteringResult }) {
  return row.osuId !== null ? (
    <OsuAvatar osuId={row.osuId} username={row.username} size={32} />
  ) : (
    <span className="size-8 rounded-full bg-muted" />
  );
}

/**
 * The players a filter checked: status, why each failed, the player and
 * their rating to two decimals, as the tool has always shown it, so a
 * rating near a bound reads closer than a whole number would. Below tablet
 * width the rows keep the rating in view.
 */
export default function FilteringResultsTable({
  results,
  onDownloadCSV,
}: {
  results: FilteringResult;
  onDownloadCSV: () => void;
}) {
  const [sort, setSort] = useState<SortState<SortKey>>(DEFAULT_SORT);
  const rows = useMemo(
    () => sortRows(results.filteringResults ?? [], sort, SORT_ACCESSORS),
    [results.filteringResults, sort]
  );

  return (
    <Panel data-testid="filter-results-table">
      <SectionHeader
        icon={ListFilter}
        title="Results"
        meta={formatCountOf(rows.length, 'player')}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={onDownloadCSV}
            disabled={rows.length === 0}
          >
            Download CSV
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="No players to display" />
      ) : (
        <DataTable
          aria-label="Filtering results"
          stickyHeader
          phoneSort={
            <SortControl
              size="sm"
              label="Sort players by"
              options={SORT_OPTIONS}
              value={sort}
              onValueChange={setSort}
            />
          }
          phoneRows={
            <PhoneRowList aria-label="Filtering results">
              {rows.map((row, index) => {
                const reasons = getFailureReasons(row.failureReason);
                const osuId =
                  row.osuId !== null ? `osu! ID ${formatId(row.osuId)}` : null;
                // Sorted by osu! ID, the line leads with it.
                const description =
                  sort.key === 'osuId'
                    ? [osuId, ...reasons]
                    : [...reasons, osuId];
                const href = playerHref(row);
                return (
                  <PhoneRow
                    key={rowKey(row, index)}
                    leading={<PhoneAvatar row={row} />}
                    leadingHref={href ?? undefined}
                    title={
                      <>
                        <PlayerName row={row} avatar={false} />
                        <StatusBadge passed={row.isSuccess} />
                      </>
                    }
                    description={description.filter(Boolean).join(' · ')}
                    value={formatRatingPrecise(row.currentRating)}
                  />
                );
              })}
            </PhoneRowList>
          }
        >
          <DataTableHeader>
            <DataTableRow>
              <SortableHeader
                sortKey="status"
                sort={sort}
                onSortChange={setSort}
                defaultDirection="asc"
                className="w-28"
              >
                Status
              </SortableHeader>
              <SortableHeader
                sortKey="player"
                sort={sort}
                onSortChange={setSort}
                defaultDirection="asc"
              >
                Player
              </SortableHeader>
              <DataTableHead>Failures</DataTableHead>
              <SortableHeader
                sortKey="osuId"
                sort={sort}
                onSortChange={setSort}
                defaultDirection="asc"
                numeric
                className="w-32"
              >
                osu! ID
              </SortableHeader>
              <SortableHeader
                sortKey="rating"
                sort={sort}
                onSortChange={setSort}
                numeric
                className="w-28"
              >
                Rating
              </SortableHeader>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {rows.map((row, index) => (
              <DataTableRow key={rowKey(row, index)}>
                <DataTableCell>
                  <StatusBadge passed={row.isSuccess} />
                </DataTableCell>
                <DataTableCell className="max-w-64">
                  <PlayerName row={row} />
                </DataTableCell>
                <DataTableCell>
                  {getFailureReasons(row.failureReason).length > 0 ? (
                    <FailureReasonsBadges failureReason={row.failureReason} />
                  ) : null}
                </DataTableCell>
                <DataTableCell numeric>
                  {row.osuId !== null ? formatId(row.osuId) : null}
                </DataTableCell>
                <DataTableCell numeric>
                  {formatRatingPrecise(row.currentRating)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </Panel>
  );
}
