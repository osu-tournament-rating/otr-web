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

const StatusCell = ({ isSuccess }: { isSuccess: boolean }) => (
  <div className="flex items-center">
    {isSuccess ? (
      <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="size-5 text-red-600 dark:text-red-400" />
    )}
  </div>
);

const PlayerCell = ({ result }: { result: PlayerFilteringResultDTO }) => {
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
    return <span className="text-muted-foreground">-</span>;
  }

  const reasons = FilteringFailReasonEnumHelper.getMetadata(failureReason);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
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
        size: 80,
      },
      {
        accessorKey: 'osuId',
        header: ({ column }) => (
          <SortableHeader column={column}>osu! ID</SortableHeader>
        ),
        cell: ({ getValue }) => (
          <div className="font-mono">{getValue() as number}</div>
        ),
        size: 120,
      },
      {
        accessorKey: 'player',
        header: () => <div className="font-semibold">Player</div>,
        cell: ({ row }) => <PlayerCell result={row.original} />,
        size: 250,
        enableSorting: false,
      },
      {
        accessorKey: 'failureReason',
        header: () => <div className="font-semibold">Failure Reasons</div>,
        cell: ({ getValue }) => (
          <FailureReasonsCell
            failureReason={getValue() as FilteringFailReason | undefined}
          />
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: results.filteringResults,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <Card className="w-full overflow-hidden">
      <div className="p-3 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 rounded-md border-b border-border pb-3 sm:border-0 sm:pb-0">
            <ListFilter className="size-6 text-primary" />
            <h3 className="text-xl font-semibold text-foreground">
              Filtering Results
            </h3>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
                <span>Passed: {results.playersPassed}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-red-600 dark:text-red-400" />
                <span>Failed: {results.playersFailed}</span>
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

        {results.filteringResults.length === 0 ? (
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
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="font-semibold text-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const isFailed = !row.original.isSuccess;
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
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
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
