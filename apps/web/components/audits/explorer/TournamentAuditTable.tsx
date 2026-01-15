'use client';

import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

import { orpc } from '@/lib/orpc/orpc';
import {
  TournamentAuditListInput,
  TournamentAuditSummary,
} from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface TournamentAuditTableProps {
  filter: Omit<TournamentAuditListInput, 'cursor' | 'limit'>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const PAGE_SIZE = 50;

function getKey(filter: Omit<TournamentAuditListInput, 'cursor' | 'limit'>) {
  return (
    pageIndex: number,
    previousPageData: {
      tournaments: TournamentAuditSummary[];
      nextCursor: number | null;
      hasMore: boolean;
    } | null
  ) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const cursor =
      pageIndex === 0 ? undefined : (previousPageData?.nextCursor ?? undefined);
    return { ...filter, cursor, limit: PAGE_SIZE };
  };
}

export default function TournamentAuditTable({
  filter,
  selectedId,
  onSelect,
}: TournamentAuditTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey(filter),
    (params) => orpc.audits.tournamentSummaries(params),
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    }
  );

  const tournaments = data?.flatMap((page) => page.tournaments) ?? [];
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && tournaments.length === 0;

  const virtualizer = useWindowVirtualizer({
    count: tournaments.length + (hasMore ? 1 : 0),
    estimateSize: () => 56,
    overscan: 10,
    scrollMargin: tableRef.current?.offsetTop ?? 0,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;
    if (lastItem.index >= tournaments.length - 5 && hasMore && !isValidating) {
      setSize(size + 1);
    }
  }, [virtualItems, tournaments.length, hasMore, isValidating, setSize, size]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, tournamentId: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(tournamentId);
      }
    },
    [onSelect]
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="bg-muted/50 flex flex-col items-center justify-center rounded-lg border p-8">
        <p className="text-muted-foreground">
          No tournaments with audit history found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table ref={tableRef}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Tournament</TableHead>
            <TableHead className="text-center">Matches</TableHead>
            <TableHead className="text-center">Games</TableHead>
            <TableHead className="text-center">Scores</TableHead>
            <TableHead className="text-right">Last Activity</TableHead>
            <TableHead className="w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {virtualItems.map((virtualRow) => {
            const tournament = tournaments[virtualRow.index];
            if (!tournament) {
              return (
                <TableRow key="loading" className="h-14">
                  <TableCell colSpan={6} className="text-center">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </TableCell>
                </TableRow>
              );
            }

            const isSelected = selectedId === tournament.id;

            return (
              <TableRow
                key={tournament.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  isSelected && 'bg-muted'
                )}
                onClick={() => onSelect(tournament.id)}
                onKeyDown={(e) => handleKeyDown(e, tournament.id)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{tournament.name}</span>
                    {tournament.abbreviation && (
                      <span className="text-muted-foreground text-xs">
                        {tournament.abbreviation}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {tournament.matchChanges > 0 ? (
                    <Badge variant="secondary">{tournament.matchChanges}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {tournament.gameChanges > 0 ? (
                    <Badge variant="secondary">{tournament.gameChanges}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {tournament.scoreChanges > 0 ? (
                    <Badge variant="secondary">{tournament.scoreChanges}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-sm">
                  {formatDistanceToNow(new Date(tournament.lastActivity), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <ChevronRight
                    className={cn(
                      'text-muted-foreground h-4 w-4 transition-transform',
                      isSelected && 'rotate-90'
                    )}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
