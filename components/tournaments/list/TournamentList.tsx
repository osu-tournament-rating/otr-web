'use client';

import { TournamentCompactDTO } from '@osu-tournament-rating/otr-api-client';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTournamentListFilter } from './TournamentListFilterContext';
import { getList } from '@/lib/actions/tournaments';
import TournamentCard from '../TournamentCard';

export default function TournamentList({
  initialData = [],
  pageSize = 30,
}: {
  initialData: TournamentCompactDTO[];
  pageSize: number;
}) {
  // region Infinite scrolling state

  const { filter } = useTournamentListFilter();
  const [tournaments, setTournaments] = useState(initialData);

  const [page, setPage] = useState(2);
  const [isFetching, setIsFetching] = useState(false);
  const [canFetchNextPage, setCanFetchNextPage] = useState(
    initialData.length === pageSize
  );

  const fetchNextPage = useCallback(async () => {
    // Check if we can request
    if (isFetching || !canFetchNextPage) {
      return;
    }

    console.log('fetching');
    setIsFetching(true);
    try {
      // Make the request
      const nextPage = await getList({
        ...filter,
        page,
        pageSize,
      });

      // Update pagination props
      setCanFetchNextPage(nextPage.length === pageSize);
      setPage((prev) => prev + 1);

      // Update results
      setTournaments((prev) => [...prev, ...nextPage]);
    } catch (e) {
      console.log(e);
      // TODO: toast
      // If there is an error, freeze infinite scrolling until refresh
      setCanFetchNextPage(false);
    } finally {
      setIsFetching(false);
    }
  }, [canFetchNextPage, filter, isFetching, page, pageSize]);

  // endregion

  const listRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useWindowVirtualizer({
    count: canFetchNextPage ? tournaments.length + 1 : tournaments.length,
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
      lastItem.index >= tournaments.length - 1 &&
      // Next page is available
      canFetchNextPage &&
      // Not currently requesting
      !isFetching
    ) {
      fetchNextPage();
    }
  }, [
    virtualizedItems,
    tournaments.length,
    canFetchNextPage,
    isFetching,
    fetchNextPage,
  ]);

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
            const isPlaceholder = item.index > tournaments.length - 1;

            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
              >
                {isPlaceholder ? (
                  canFetchNextPage ? (
                    <LoadingPlaceholder />
                  ) : (
                    <NoMoreResultsPlaceholder />
                  )
                ) : (
                  <TournamentCard
                    tournament={tournaments[item.index]}
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
