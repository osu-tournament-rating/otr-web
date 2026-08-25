'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LeaderboardEntry } from '@/lib/orpc/schema/leaderboard';
import { cn } from '@/lib/utils';
import { stickyTableHeaderFromLg } from '@/lib/utils/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  currentUserPlayerId?: number | null;
}

export function LeaderboardDataTable<TData, TValue>({
  columns,
  data,
  currentUserPlayerId,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const getRowClassName = (row: Row<TData>, index: number) => {
    const rowData = row.original as LeaderboardEntry;
    const isCurrentUser =
      currentUserPlayerId && rowData.player?.id === currentUserPlayerId;

    if (isCurrentUser) {
      return 'bg-primary/20';
    }

    return `${index % 2 === 0 ? 'bg-background/50' : 'bg-muted/10'}`;
  };

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border',
        stickyTableHeaderFromLg
      )}
    >
      <Table data-testid="leaderboard-table">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted">
              {headerGroup.headers.map((header) => {
                return (
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
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, index) => (
              <TableRow
                key={row.id}
                data-testid={`leaderboard-row-${(row.original as LeaderboardEntry).player?.id}`}
                data-state={row.getIsSelected() && 'selected'}
                className={getRowClassName(row, index)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 bg-muted/10 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
