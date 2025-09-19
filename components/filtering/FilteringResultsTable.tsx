'use client';

import { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { CheckCircle2, XCircle, ListFilter, Download } from 'lucide-react';
import {
  FilteringResult,
  PlayerFilteringResult,
} from '@/lib/orpc/schema/filtering';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import FailureReasonsBadges from './FailureReasonsBadges';
import PlayerCell from './PlayerCell';
import StatusIcon from './StatusIcon';
import { SortableHeader, NumericCell } from './tableHelpers';

interface FilteringResultsTableProps {
  results: FilteringResult;
  onDownloadCSV: () => void;
  hideCard?: boolean;
}

export default function FilteringResultsTable({
  results,
  onDownloadCSV,
  hideCard = false,
}: FilteringResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'isSuccess', desc: false },
  ]);

  const columns: ColumnDef<PlayerFilteringResult>[] = useMemo(
    () => [
      {
        accessorKey: 'isSuccess',
        header: ({ column }) => (
          <SortableHeader column={column}>✓</SortableHeader>
        ),
        cell: ({ row }) => <StatusIcon isSuccess={row.original.isSuccess} />,
      },
      {
        accessorKey: 'failureReason',
        header: () => (
          <div className="text-center text-sm font-semibold">Failures</div>
        ),
        cell: ({ row }) => (
          <FailureReasonsBadges
            failureReason={row.original.failureReason ?? undefined}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'osuId',
        header: ({ column }) => (
          <SortableHeader column={column}>osu! ID</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell value={getValue() as number | undefined | null} />
        ),
      },
      {
        accessorKey: 'username',
        header: ({ column }) => (
          <SortableHeader column={column}>Player</SortableHeader>
        ),
        cell: ({ row }) => <PlayerCell result={row.original} />,
        sortingFn: (rowA, rowB) => {
          const usernameA = rowA.original.username || '';
          const usernameB = rowB.original.username || '';
          return usernameA.localeCompare(usernameB, undefined, {
            sensitivity: 'base',
          });
        },
      },
      {
        accessorKey: 'currentRating',
        header: ({ column }) => (
          <SortableHeader column={column}>Rating</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell
            value={getValue() as number | undefined | null}
            format={(v) => v.toFixed(0)}
          />
        ),
      },
      {
        accessorKey: 'peakRating',
        header: ({ column }) => (
          <SortableHeader column={column}>Peak</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell
            value={getValue() as number | undefined | null}
            format={(v) => v.toFixed(0)}
          />
        ),
      },
      {
        accessorKey: 'tournamentsPlayed',
        header: ({ column }) => (
          <SortableHeader column={column}>Tournaments</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell value={getValue() as number | undefined | null} />
        ),
      },
      {
        accessorKey: 'matchesPlayed',
        header: ({ column }) => (
          <SortableHeader column={column}>Matches</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell value={getValue() as number | undefined | null} />
        ),
      },
    ],
    []
  );

  // Ensure data is an array
  const safeData =
    results && Array.isArray(results.filteringResults)
      ? results.filteringResults
      : [];

  const table = useReactTable({
    data: safeData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  // Early return if no results
  if (!results || !results.filteringResults) {
    const noResultsContent = (
      <div className="p-8 text-center text-muted-foreground">
        No filtering results to display.
      </div>
    );
    return hideCard ? (
      noResultsContent
    ) : (
      <Card className="w-full">{noResultsContent}</Card>
    );
  }

  const tableContent = (
    <>
      {!hideCard && (
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="size-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Filtering Results
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                <span>Passed: {results.playersPassed ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-red-600 dark:text-red-400" />
                <span>Failed: {results.playersFailed ?? 0}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onDownloadCSV}
              className="flex items-center gap-2"
            >
              <Download className="size-4" />
              Download CSV
            </Button>
          </div>
        </div>
      )}
      {hideCard && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ListFilter className="size-4 text-muted-foreground" />
            Results
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadCSV}
            className="flex items-center gap-2"
          >
            <Download className="size-4" />
            Download CSV
          </Button>
        </div>
      )}

      {safeData.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No players to display.
        </div>
      ) : (
        <div
          className={cn(
            'overflow-x-auto rounded-lg border',
            hideCard && 'bg-background'
          )}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => {
                    const getHeaderClass = () => {
                      switch (header.column.id) {
                        case 'isSuccess':
                          return 'w-8 text-center';
                        case 'failureReason':
                          return 'text-center';
                        case 'osuId':
                          return 'w-[70px] text-center';
                        case 'player':
                          return 'min-w-[60px]';
                        case 'currentRating':
                        case 'peakRating':
                          return 'w-[50px] text-center';
                        case 'tournamentsPlayed':
                        case 'matchesPlayed':
                          return 'w-[50px] text-center';
                        default:
                          return '';
                      }
                    };

                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'px-2 font-semibold text-foreground',
                          getHeaderClass()
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => {
                const isFailed = row.original?.isSuccess === false;
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'transition-colors duration-200',
                      isFailed
                        ? 'bg-red-50/50 hover:bg-red-100/50 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn('px-2 py-1.5 text-center')}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );

  return hideCard ? (
    tableContent
  ) : (
    <Card className="w-full overflow-hidden p-4">{tableContent}</Card>
  );
}
