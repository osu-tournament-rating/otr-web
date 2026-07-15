'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, SearchX } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import useSWRInfinite, { type SWRInfiniteKeyLoader } from 'swr/infinite';
import { type Fetcher } from 'swr';

import TournamentListRow from '@/components/tournaments/TournamentListRow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import {
  type TournamentListItem,
  type TournamentListRequest,
} from '@/lib/orpc/schema/tournament';
import { type TournamentListFilter } from '@/lib/types';
import { RANK_RANGE_DEFAULT_MAX, RANK_RANGE_MIN } from './tournamentRankSlider';

const pageSize = 30;

const toDateParam = (value?: Date | string) =>
  value ? (value instanceof Date ? value.toISOString() : value) : undefined;

const serializeFilter = (
  filter: TournamentListFilter,
  page: number
): TournamentListRequest => ({
  page,
  pageSize,
  verified: filter.verified,
  ruleset: filter.ruleset,
  searchQuery: filter.searchQuery?.trim()
    ? filter.searchQuery.trim()
    : undefined,
  dateMin: toDateParam(filter.dateMin),
  dateMax: toDateParam(filter.dateMax),
  verificationStatus:
    filter.verificationStatus && filter.verificationStatus.length > 0
      ? filter.verificationStatus
      : undefined,
  rejectionReason: filter.rejectionReason,
  submittedBy: filter.submittedBy,
  verifiedBy: filter.verifiedBy,
  lobbySize:
    filter.lobbySize && filter.lobbySize.length > 0
      ? filter.lobbySize
      : undefined,
  minRankRange: filter.minRankRange,
  maxRankRange: filter.maxRankRange,
  sort: filter.sort,
  descending: filter.descending,
});

const fetcher =
  (): Fetcher<TournamentListItem[], TournamentListRequest> => async (params) =>
    await orpc.tournaments.list(params);

const getKey = (
  filter: TournamentListFilter
): SWRInfiniteKeyLoader<TournamentListItem[], TournamentListRequest | null> => {
  return (index, previous) => {
    if (previous && previous.length === 0) return null;
    return serializeFilter(filter, index + 1);
  };
};

function hasActiveFilters(filter: TournamentListFilter) {
  return Boolean(
    filter.verified ||
    filter.ruleset !== undefined ||
    filter.searchQuery?.trim() ||
    filter.dateMin ||
    filter.dateMax ||
    filter.verificationStatus?.length ||
    filter.rejectionReason !== undefined ||
    filter.submittedBy !== undefined ||
    filter.verifiedBy !== undefined ||
    filter.lobbySize?.length ||
    (filter.minRankRange !== undefined &&
      filter.minRankRange !== RANK_RANGE_MIN) ||
    (filter.maxRankRange !== undefined &&
      filter.maxRankRange !== RANK_RANGE_DEFAULT_MAX)
  );
}

export default function TournamentList({
  filter,
}: {
  filter: TournamentListFilter;
}) {
  const { data, error, setSize, isValidating, isLoading, mutate } =
    useSWRInfinite(getKey(filter), fetcher(), {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    });

  const listRef = useRef<HTMLDivElement | null>(null);
  const tournamentData = data ? data.flat() : [];
  const expectNextPage = data?.at(-1)?.length === pageSize;
  const virtualCount =
    tournamentData.length +
    (expectNextPage && tournamentData.length > 0 ? 1 : 0);

  const virtualizer = useWindowVirtualizer({
    count: virtualCount,
    estimateSize: () => 112,
    overscan: 6,
    scrollMargin: listRef.current?.offsetTop ?? 0,
    getItemKey: (index) => tournamentData[index]?.id ?? `loader-${index}`,
  });

  const virtualizedItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualizedItems.at(-1);

    if (!lastItem || error || !expectNextPage || isLoading || isValidating) {
      return;
    }

    if (lastItem.index >= tournamentData.length) {
      setSize((size) => size + 1);
    }
  }, [
    error,
    expectNextPage,
    isLoading,
    isValidating,
    setSize,
    tournamentData.length,
    virtualizedItems,
  ]);

  if (error && !data) {
    return <ErrorState onRetry={() => void mutate()} />;
  }

  if (!data) {
    return <InitialLoadingState />;
  }

  if (tournamentData.length === 0) {
    return <EmptyState isFiltered={hasActiveFilters(filter)} />;
  }

  return (
    <>
      <ListHeader />
      <div
        ref={listRef}
        role="list"
        aria-label="Tournament submissions"
        aria-busy={isValidating}
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        <div
          className="absolute top-0 left-0 w-full divide-y"
          style={{
            transform: `translateY(${
              (virtualizedItems[0]?.start ?? 0) -
              virtualizer.options.scrollMargin
            }px)`,
          }}
        >
          {virtualizedItems.map((item) => {
            const isPlaceholder = item.index >= tournamentData.length;

            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                role="listitem"
              >
                {isPlaceholder ? (
                  error ? (
                    <LoadMoreError onRetry={() => void mutate()} />
                  ) : (
                    <ListItemSkeleton label="Loading more tournaments" />
                  )
                ) : (
                  <Link
                    href={`/tournaments/${tournamentData[item.index].id}`}
                    data-testid="tournament-list-item"
                    aria-label={`View ${tournamentData[item.index].name}`}
                    className="group block transition-colors hover:bg-muted/40 focus-visible:relative focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset dark:hover:bg-secondary/70"
                  >
                    <TournamentListRow
                      tournament={tournamentData[item.index]}
                    />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!expectNextPage && tournamentData.length >= pageSize && (
        <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
          You&apos;ve reached the end of the archive.
        </p>
      )}
    </>
  );
}

function ListHeader() {
  return (
    <div
      aria-hidden="true"
      className="hidden grid-cols-[minmax(0,1fr)_18rem_230px] gap-5 border-b bg-muted/30 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid dark:bg-secondary/45"
    >
      <span>Tournament</span>
      <span>Format</span>
      <span className="text-right">Dates</span>
    </div>
  );
}

function InitialLoadingState() {
  return (
    <div role="status" aria-label="Loading tournaments">
      <ListHeader />
      <div className="divide-y">
        {Array.from({ length: 7 }, (_, index) => (
          <ListItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function ListItemSkeleton({ label }: { label?: string }) {
  return (
    <div className="grid min-h-28 gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_18rem_230px] lg:items-center lg:gap-5">
      {label && <span className="sr-only">{label}</span>}
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-36 lg:ml-auto" />
    </div>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div
      data-testid="tournament-empty-state"
      className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted dark:bg-secondary">
        <SearchX className="size-6 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">
        {isFiltered ? 'No tournaments match' : 'No tournaments yet'}
      </h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        {isFiltered
          ? 'Try a different name, ruleset, or fewer filters.'
          : 'No tournament submissions are available right now.'}
      </p>
      {isFiltered && (
        <Button asChild variant="outline" className="mt-5">
          <Link href="/tournaments">Clear filters</Link>
        </Button>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">Tournaments could not load</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
        The archive is temporarily unavailable. Try the request again.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onRetry}
        className="mt-5"
      >
        <RefreshCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

function LoadMoreError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-5 text-sm text-muted-foreground">
      <span>More tournaments could not load.</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
