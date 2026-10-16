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

/** The player's name and avatar as one link, or "Unknown" when o!TR has no player. */
function PlayerName({ row }: { row: PlayerFilteringResult }) {
  if (!row.username || !row.playerId || row.osuId === null) {
    return <span className="font-medium text-muted-foreground">Unknown</span>;
  }

  return (
    <EntityLink
      href={`/players/${row.playerId}`}
      leading={
        <OsuAvatar osuId={row.osuId} username={row.username} size={24} />
      }
    >
      {row.username}
    </EntityLink>
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
          phoneRows={
            <PhoneRowList aria-label="Filtering results">
              {rows.map((row, index) => {
                const reasons = getFailureReasons(row.failureReason);
                return (
                  <PhoneRow
                    key={rowKey(row, index)}
                    title={
                      <>
                        <PlayerName row={row} />
                        <StatusBadge passed={row.isSuccess} />
                      </>
                    }
                    description={[
                      ...reasons,
                      row.osuId !== null
                        ? `osu! ID ${formatId(row.osuId)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
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
