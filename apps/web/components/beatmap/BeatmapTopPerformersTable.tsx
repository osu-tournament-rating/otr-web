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
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, User } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ModIconset from '@/components/icons/ModIconset';
import { formatAccuracy } from '@/lib/utils/format';
import type { BeatmapTopPerformer } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapTopPerformersTableProps {
  performers: BeatmapTopPerformer[];
  className?: string;
}

const columnHelper = createColumnHelper<BeatmapTopPerformer>();

const columns = [
  columnHelper.display({
    id: 'rank',
    header: '#',
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">#{row.index + 1}</span>
    ),
  }),
  columnHelper.accessor('player.username', {
    header: 'Player',
    cell: ({ row }) => {
      const player = row.original.player;
      return (
        <Link
          href={`/players/${player.id}`}
          className="flex items-center gap-2"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={`https://a.ppy.sh/${player.osuId}`}
              alt={player.username}
            />
            <AvatarFallback>
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span className="hover:underline">{player.username}</span>
        </Link>
      );
    },
    enableSorting: false,
  }),
  columnHelper.accessor('score', {
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 h-auto p-0 font-semibold hover:bg-transparent"
      >
        Score
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ getValue }) => getValue().toLocaleString(),
  }),
  columnHelper.accessor('accuracy', {
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-4 h-auto p-0 font-semibold hover:bg-transparent"
      >
        Accuracy
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-4 w-4" />
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4" />
        )}
      </Button>
    ),
    cell: ({ getValue }) => {
      const acc = getValue();
      return acc !== null ? formatAccuracy(acc) : '-';
    },
  }),
  columnHelper.accessor('mods', {
    header: 'Mods',
    cell: ({ getValue }) => (
      <div className="flex h-5 w-14 items-center">
        <ModIconset mods={getValue()} className="flex h-full items-center" iconClassName="h-5" />
      </div>
    ),
    enableSorting: false,
  }),
];

export default function BeatmapTopPerformersTable({
  performers,
  className,
}: BeatmapTopPerformersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'score', desc: true },
  ]);

  const table = useReactTable({
    data: performers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (performers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No performance data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-popover/50">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-border/50 hover:bg-transparent"
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
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border/30 transition-colors hover:bg-popover/80"
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
