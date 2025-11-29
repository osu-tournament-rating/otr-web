'use client';

import { useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import ModIconset from '@/components/icons/ModIconset';
import type { BeatmapTournamentUsage } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapTournamentsTableProps {
  tournaments: BeatmapTournamentUsage[];
  className?: string;
}

const columnHelper = createColumnHelper<BeatmapTournamentUsage>();

const columns = [
  columnHelper.accessor('tournament.name', {
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        Tournament
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/tournaments/${row.original.tournament.id}`}
        className="line-clamp-2 hover:underline"
      >
        {row.original.tournament.name}
      </Link>
    ),
  }),
  columnHelper.accessor('gameCount', {
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        Games
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ getValue }) => getValue(),
  }),
  columnHelper.accessor('mostCommonMod', {
    header: 'Mod',
    cell: ({ getValue }) => (
      <div className="flex h-5 items-center">
        <ModIconset mods={getValue()} iconClassName="h-5" />
      </div>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor((row) => row.tournament.endTime, {
    id: 'date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="h-auto p-0 font-semibold hover:bg-transparent"
      >
        Date
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ row }) => {
      const endTime = row.original.tournament.endTime;
      return endTime ? format(new Date(endTime), 'MMM yyyy') : 'Unknown';
    },
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.original.tournament.endTime
        ? new Date(rowA.original.tournament.endTime).getTime()
        : 0;
      const dateB = rowB.original.tournament.endTime
        ? new Date(rowB.original.tournament.endTime).getTime()
        : 0;
      return dateA - dateB;
    },
  }),
];

export default function BeatmapTournamentsTable({
  tournaments,
  className,
}: BeatmapTournamentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true },
  ]);

  const table = useReactTable({
    data: tournaments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (tournaments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tournament Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This beatmap has not been used in any verified tournaments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Tournament Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b bg-muted/50 hover:bg-muted/50"
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
              {table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${
                    index % 2 === 0 ? 'bg-background/50' : 'bg-muted/10'
                  }`}
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
