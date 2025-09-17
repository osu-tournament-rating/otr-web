'use client';

import { Fetcher } from 'swr';
import { useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite';
import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TournamentListFilter } from '@/lib/types';
import { orpc } from '@/lib/orpc/orpc';
import {
  TournamentListItem,
  TournamentListRequest,
} from '@/lib/orpc/schema/tournament';

import TournamentCard from '../TournamentCard';

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
  verificationStatus: filter.verificationStatus,
  rejectionReason: filter.rejectionReason,
  submittedBy: filter.submittedBy,
  verifiedBy: filter.verifiedBy,
  lobbySize: filter.lobbySize,
  sort: filter.sort,
  descending: filter.descending,
});

const fetcher = (): Fetcher<TournamentListItem[], TournamentListRequest> => {
  return async (params) => await orpc.tournaments.list(params);
};

const getKey = (
  filter: TournamentListFilter
): SWRInfiniteKeyLoader<TournamentListItem[], TournamentListRequest | null> => {
  return (index, previous) => {
    if (previous && previous.length === 0) {
      return null;
    }

    return serializeFilter(filter, index + 1);
  };
};

export default function TournamentList({
  filter,
}: {
  filter: TournamentListFilter;
}) {
  const { data, error, setSize, isValidating, isLoading } = useSWRInfinite(
    getKey(filter),
    fetcher(),
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    }
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const tournamentData = data ? data.flat() : [];
  const expectNextPage = data?.at(-1)?.length === pageSize;

  const virtualizer = useWindowVirtualizer({
    count: Math.max(tournamentData.length + 1, 1),
    estimateSize: () => 100,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const virtualizedItems = virtualizer.getVirtualItems();

  // Handle infinite scroll
  useEffect(() => {
    const lastItem = virtualizedItems.at(-1);

    if (!lastItem) {
      return;
    }

    if (
      // Last virtual item is the end of the available data
      lastItem.index >= tournamentData.length &&
      // Next page is available
      expectNextPage &&
      // Not currently requesting
      !isLoading &&
      !isValidating
    ) {
      setSize((size) => size + 1);
    }
  }, [
    expectNextPage,
    isLoading,
    isValidating,
    setSize,
    tournamentData.length,
    virtualizedItems,
  ]);

  // Errors
  if (error) {
    return <h1>Failed to fetch tournament data</h1>;
  }

  // Initial load
  if (!data) {
    return (
      <div className="flex flex-col space-y-1">
        {[...Array(pageSize / 5)].map((_, idx) => (
          <ListItemSkeleton key={idx} />
        ))}
      </div>
    );
  }

  return (
    <div ref={listRef}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        <div
          className="absolute top-0 left-0 w-full space-y-1"
          style={{
            transform: `translateY(${
              (virtualizedItems[0]?.start ?? 0) -
              virtualizer.options.scrollMargin
            }px)`,
          }}
        >
          {virtualizedItems.map((item) => {
            // Show "no results" card if there are no tournaments
            if (tournamentData.length === 0 && item.index === 0) {
              return (
                <div
                  className="relative w-full"
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                >
                  <NoResultsCard />
                </div>
              );
            }

            const isPlaceholder = item.index >= tournamentData.length;

            return (
              <div
                className="relative w-full pb-5"
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
              >
                {isPlaceholder ? (
                  expectNextPage ? (
                    <ListItemSkeleton />
                  ) : null
                ) : (
                  <Link href={`/tournaments/${tournamentData[item.index].id}`}>
                    <TournamentCard
                      tournament={tournamentData[item.index]}
                      displayStatusText
                    />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ListItemSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />;
}

function NoResultsCard() {
  return (
    <Card className="p-4 font-sans sm:p-6">
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <h3 className="text-2xl font-bold text-primary">Nothing found...</h3>
        <p className="text-muted-foreground">
          Try a less restrictive filter for better results!
        </p>
      </div>
    </Card>
  );
}
