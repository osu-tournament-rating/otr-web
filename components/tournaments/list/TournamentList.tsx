'use client';

import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { Fetcher } from 'swr';
import { useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite';
import { TournamentsListRequestParams } from '@osu-tournament-rating/otr-api-client';
import { TournamentListFilter } from '@/lib/types';
import TournamentCard from '../TournamentCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/lib/hooks/useSession';
import { getTournamentsList } from '@/lib/actions/tournaments';
import Link from 'next/link';

const pageSize = 30;

const fetcher = (): Fetcher<
  TournamentCompactDTO[],
  TournamentsListRequestParams
> => {
  return async (params) => await getTournamentsList(params);
};

const getKey = (
  filter: TournamentListFilter
): SWRInfiniteKeyLoader<
  TournamentCompactDTO[],
  TournamentsListRequestParams | null
> => {
  return (index, previous) => {
    if (previous && !previous.length) {
      return null;
    }

    return {
      ...filter,
      page: index + 1,
      pageSize,
    };
  };
};

export default function TournamentList({
  filter,
}: {
  filter: TournamentListFilter;
}) {
  const session = useSession();
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
  const firstPageHasData = data?.at(0)?.length ?? 0 > 0;
  const expectNextPage = data?.at(-1)?.length === pageSize;

  const virtualizer = useWindowVirtualizer({
    count: tournamentData.length + 1,
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
  if (!session || error) {
    return <h1>Something is wrong :D</h1>;
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

  // No results
  if (!firstPageHasData) {
    return <NoResultsPlaceholder />;
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
          className="absolute top-0 left-0 w-full space-y-1 p-4"
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
                className="relative w-full"
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
              >
                {isPlaceholder ? (
                  expectNextPage ? (
                    <ListItemSkeleton />
                  ) : (
                    <NoMoreResultsPlaceholder />
                  )
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

function PlaceholderBase({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-4">
      <p className="flex flex-col items-center">{children}</p>
    </div>
  );
}

function NoMoreResultsPlaceholder() {
  return (
    <PlaceholderBase>
      <span className="text-lg text-primary">No more results!</span>
      <span className="text-sm text-muted">
        Try a less restrictive filter to see more
      </span>
    </PlaceholderBase>
  );
}

function NoResultsPlaceholder() {
  return (
    <PlaceholderBase>
      <strong className="text-2xl text-primary">Nothing found...</strong>
      <span className="text-muted">
        Try a less restrictive filter for better results!
      </span>
    </PlaceholderBase>
  );
}
