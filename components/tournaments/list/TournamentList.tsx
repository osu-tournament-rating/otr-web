'use client';

import {
  TournamentCompactDTO,
  TournamentsWrapper,
} from '@osu-tournament-rating/otr-api-client';
import { Fetcher } from 'swr';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite';
import { TournamentsListRequestParams } from '@osu-tournament-rating/otr-api-client';
import { TournamentListFilter } from '@/lib/types';
import TournamentCard from '../TournamentCard';

const pageSize = 30;

const tournaments = (token: string) =>
  new TournamentsWrapper({
    baseUrl: '',
    clientConfiguration: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

const fetcher = (
  token?: string
): Fetcher<TournamentCompactDTO[], TournamentsListRequestParams> => {
  if (!token) {
    return () => [];
  }
  return (params) =>
    tournaments(token)
      .list(params)
      .then((res) => res.result);
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
  const { data: session } = useSession();
  const { data, error, setSize, isValidating, isLoading } = useSWRInfinite(
    getKey(filter),
    fetcher(session?.accessToken),
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    }
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const tournamentData = data ? data.flat() : [];
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

  if (!session || error) {
    return null;
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
          className="absolute top-0 left-0 w-full space-y-2"
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
              >
                {isPlaceholder ? (
                  expectNextPage ? (
                    <LoadingPlaceholder />
                  ) : (
                    <NoMoreResultsPlaceholder />
                  )
                ) : (
                  <TournamentCard
                    tournament={tournamentData[item.index]}
                    titleIsLink
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div>
      <p>Loading...</p>
    </div>
  );
}

function NoMoreResultsPlaceholder() {
  return (
    <div>
      <p>No more results!</p>
    </div>
  );
}
