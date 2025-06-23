'use client';

import {
  FilteringResultDTO,
  PlayerFilteringResultDTO,
  FilteringFailReason,
} from '@osu-tournament-rating/otr-api-client';
import { FilteringFailReasonEnumHelper } from '@/lib/enums';
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
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  ListFilter,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FilteringResultsTableProps {
  results: FilteringResultDTO;
  onDownloadCSV: () => void;
}

const SortableHeader = ({
  column,
  children,
}: {
  column: {
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | 'asc' | 'desc';
  };
  children: React.ReactNode;
}) => (
  <Button
    variant="ghost"
    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    className="h-auto p-0 font-semibold hover:bg-transparent"
  >
    {children}
    {column.getIsSorted() === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : column.getIsSorted() === 'desc' ? (
      <ArrowDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    )}
  </Button>
);

const StatusCell = ({ isSuccess }: { isSuccess: boolean | undefined | null }) => (
  <div className="flex items-center justify-center">
    {isSuccess ? (
      <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="size-5 text-red-600 dark:text-red-400" />
    )}
  </div>
);

const PlayerCell = ({ result }: { result: PlayerFilteringResultDTO | null | undefined }) => {
  if (!result) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (!result.username || !result.playerId) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-muted" />
        <span className="text-muted-foreground">
          Unknown Player (ID: {result.osuId})
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Image
        src={`https://a.ppy.sh/${result.osuId}`}
        alt={`${result.username} avatar`}
        className="flex-shrink-0 rounded-full"
        width={32}
        height={32}
        onError={(e) => {
          // Fallback to default avatar on error
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
      <Link
        href={`/players/${result.playerId}`}
        className="truncate font-medium transition-colors hover:text-primary"
      >
        {result.username}
      </Link>
    </div>
  );
};

const FailureReasonsCell = ({
  failureReason,
}: {
  failureReason?: FilteringFailReason;
}) => {
  if (
    failureReason === undefined ||
    failureReason === null ||
    failureReason === FilteringFailReason.None
  ) {
    return <div className="text-center text-muted-foreground">-</div>;
  }

  const reasons = FilteringFailReasonEnumHelper.getMetadata(failureReason);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap justify-center gap-1">
        {reasons.map((reason) => (
          <Tooltip key={reason.text}>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="cursor-help text-xs">
                {reason.text}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{reason.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

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
        cell: ({ row }) => <StatusCell isSuccess={row.original.isSuccess} />,
      },
      {
        accessorKey: 'failureReason',
        header: () => <div className="text-center font-semibold">Failure Reasons</div>,
        cell: ({ getValue }) => (
          <FailureReasonsCell
            failureReason={getValue() as FilteringFailReason | undefined}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'osuId',
        header: ({ column }) => (
          <SortableHeader column={column}>osu! ID</SortableHeader>
        ),
        cell: ({ getValue }) => {
          const osuId = getValue() as number | undefined | null;
          return osuId !== undefined && osuId !== null ? (
            <div className="text-center font-mono">{osuId}</div>
          ) : (
            <div className="text-center text-muted-foreground">-</div>
          );
        },
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
        cell: ({ getValue }) => {
          const rating = getValue() as number | undefined | null;
          return rating !== undefined && rating !== null ? (
            <div className="text-center font-mono">{rating.toFixed(0)}</div>
          ) : (
            <div className="text-center text-muted-foreground">-</div>
          );
        },
      },
      {
        accessorKey: 'peakRating',
        header: ({ column }) => (
          <SortableHeader column={column}>Peak Rating</SortableHeader>
        ),
        cell: ({ getValue }) => {
          const rating = getValue() as number | undefined | null;
          return rating !== undefined && rating !== null ? (
            <div className="text-center font-mono">{rating.toFixed(0)}</div>
          ) : (
            <div className="text-center text-muted-foreground">-</div>
          );
        },
      },
      {
        accessorKey: 'osuGlobalRank',
        header: ({ column }) => (
          <SortableHeader column={column}>osu! Rank</SortableHeader>
        ),
        cell: ({ getValue }) => {
          const rank = getValue() as number | undefined | null;
          return rank !== undefined && rank !== null ? (
            <div className="text-center font-mono">#{rank.toLocaleString()}</div>
          ) : (
            <div className="text-center text-muted-foreground">-</div>
          );
        },
      },
      {
        accessorKey: 'tournamentsPlayed',
        header: ({ column }) => (
          <SortableHeader column={column}>Tournaments</SortableHeader>
        ),
        cell: ({ getValue }) => {
          const count = getValue() as number | undefined | null;
          return count !== undefined && count !== null ? (
            <div className="font-mono">{count}</div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'matchesPlayed',
        header: ({ column }) => (
          <SortableHeader column={column}>Matches</SortableHeader>
        ),
        cell: ({ getValue }) => {
          const count = getValue() as number | undefined | null;
          return count !== undefined && count !== null ? (
            <div className="font-mono">{count}</div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
    ],
    []
  );

  // Ensure data is an array
  const safeData = results && Array.isArray(results.filteringResults) ? results.filteringResults : [];

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
    <Card className="w-full overflow-hidden">
      <div className="p-4">
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
      </div>
    </Card>
  );
}
