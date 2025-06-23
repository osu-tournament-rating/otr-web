'use client';

import {
  FilteringResultDTO,
  PlayerFilteringResultDTO,
} from '@osu-tournament-rating/otr-api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, ListFilter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import FailureReasonsBadges from './FailureReasonsBadges';
import PlayerCell from './PlayerCell';
import StatusIcon from './StatusIcon';
import { SortableHeader, NumericCell } from './tableHelpers';

interface FilteringResultsTableProps {
  results: FilteringResultDTO;
  onDownloadCSV: () => void;
}

export default function FilteringResultsTable({
  results,
  onDownloadCSV,
}: FilteringResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'isSuccess', desc: false },
  ]);

  const columns: ColumnDef<PlayerFilteringResultDTO>[] = useMemo(
    () => [
      {
        accessorKey: 'isSuccess',
        header: ({ column }) => (
          <SortableHeader column={column}>Status</SortableHeader>
        ),
        cell: ({ row }) => <StatusIcon isSuccess={row.original.isSuccess} />,
      },
      {
        accessorKey: 'failureReason',
        header: () => (
          <div className="text-center font-semibold">Failure Reasons</div>
        ),
        cell: ({ row }) => (
          <FailureReasonsBadges failureReason={row.original.failureReason} />
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
        accessorKey: 'player',
        header: () => <div className="font-semibold">Player</div>,
        cell: ({ row }) => <PlayerCell result={row.original} />,
        enableSorting: false,
      },
      {
        accessorKey: 'currentRating',
        header: ({ column }) => (
          <SortableHeader column={column}>Current Rating</SortableHeader>
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
          <SortableHeader column={column}>Peak Rating</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell
            value={getValue() as number | undefined | null}
            format={(v) => v.toFixed(0)}
          />
        ),
      },
      {
        accessorKey: 'osuGlobalRank',
        header: ({ column }) => (
          <SortableHeader column={column}>osu! Rank</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <NumericCell
            value={getValue() as number | undefined | null}
            format={(v) => `#${v.toLocaleString()}`}
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
    return (
      <Card className="w-full">
        <div className="p-8 text-center text-muted-foreground">
          No filtering results to display.
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full overflow-hidden p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="size-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Filtering Results
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
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

        {safeData.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No players to display.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="bg-muted/50 hover:bg-muted/70"
                  >
                    {headerGroup.headers.map((header) => {
                      const getHeaderClass = () => {
                        switch (header.column.id) {
                          case 'isSuccess':
                            return 'w-20 text-center';
                          case 'failureReason':
                            return 'w-48 text-center';
                          case 'osuId':
                            return 'w-28 text-center';
                          case 'player':
                            return 'min-w-[200px]';
                          case 'currentRating':
                          case 'peakRating':
                            return 'w-32 text-center';
                          case 'osuGlobalRank':
                            return 'w-32 text-center';
                          case 'tournamentsPlayed':
                          case 'matchesPlayed':
                            return 'w-28 text-center';
                          default:
                            return '';
                        }
                      };

                      return (
                        <TableHead
                          key={header.id}
                          className={cn(
                            'font-semibold text-foreground',
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
                        const getCellClass = () => {
                          switch (cell.column.id) {
                            case 'isSuccess':
                              return 'text-center';
                            case 'failureReason':
                            case 'osuId':
                            case 'currentRating':
                            case 'peakRating':
                            case 'osuGlobalRank':
                              return 'text-center';
                            case 'tournamentsPlayed':
                            case 'matchesPlayed':
                              return 'text-center';
                            default:
                              return '';
                          }
                        };

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn('py-3', getCellClass())}
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
    </Card>
  );
}
