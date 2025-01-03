'use client';

import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext/TournamentListDataContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CellMeasurer,
  CellMeasurerCache,
  InfiniteLoader,
  List,
  ListRowRenderer,
  WindowScroller,
} from 'react-virtualized';
import {
  TournamentCompactDTO,
  TournamentDTO,
} from '@osu-tournament-rating/otr-api-client';
import { PaginationProps } from '@/lib/types';
import { getTournament, getTournamentList } from '@/app/actions/tournaments';

type TournamentListItemData = {
  /** Tournament */
  data: TournamentDTO;

  /** If the data is "full" including optional data */
  isFullData: boolean;
};

function mapItemData(
  tournaments: (TournamentCompactDTO | TournamentDTO)[]
): TournamentListItemData[] {
  return tournaments.map((t) => ({
    data: t as TournamentDTO,
    isFullData: false,
  }));
}

export default function TournamentList({
  tournaments = [],
  page = 1,
  pageSize = 20,
}: {
  tournaments: (TournamentCompactDTO | TournamentDTO)[];
} & PaginationProps) {
  // Manage list data fetching
  const { filter } = useTournamentListFilter();
  const [listData, setListData] = useState<TournamentListItemData[]>(() =>
    mapItemData(tournaments)
  );

  const [pageNumber, setPageNumber] = useState<number>(page);
  const [isRequesting, setIsRequesting] = useState(false);
  const [canRequestNextPage, setCanRequestNextPage] = useState(
    tournaments.length === pageSize
  );

  const requestNextPage = async () => {
    // Check if we can request
    if (isRequesting || !canRequestNextPage) {
      return;
    }

    setIsRequesting(true);
    try {
      // Make the request
      const nextPage = await getTournamentList({
        ...filter,
        pageSize,
        page: pageNumber,
      });

      // Update pagination props
      setCanRequestNextPage(nextPage.length === pageSize);
      setPageNumber((prev) => prev + 1);

      // Update results
      setListData((prev) => [...prev, ...mapItemData(nextPage)]);
    } catch (e) {
      console.log(e);
      // TODO: toast
      // If there is an error, freeze infinite scrolling until refresh
      setCanRequestNextPage(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const requestFullItem = async (
    item: TournamentListItemData,
    refresh: boolean = false
  ) => {
    const { data, isFullData } = item;
    const itemIdx = listData.indexOf(item);
    if (isRequesting || itemIdx === -1 || (isFullData && !refresh)) {
      return;
    }

    try {
      setIsRequesting(true);

      const fullTournament = await getTournament({
        id: data.id,
        verified: filter.verified,
      });
      // Replace the item in place with the full data
      setListData((prev) =>
        prev.with(itemIdx, { data: fullTournament, isFullData: true })
      );
    } catch (e) {
      // TODO: error toast
      console.log(e);
      // Even if we failed to get the full data, prevent it from being fetched again until refresh
      setListData((prev) => prev.with(itemIdx, { data, isFullData: true }));
    } finally {
      setIsRequesting(false);
    }
  };

  const windowScrollerRef = useRef<WindowScroller>(null);

  // State to control dynamic row heights
  const [expandedRowIndices, setExpandedRowIndices] = useState<Set<number>>(
    new Set()
  );
  const rowHeightCache = new CellMeasurerCache({ fixedWidth: true });

  const toggleRowIsExpanded = (index: number) => {
    setExpandedRowIndices((prev) => {
      const newIndices = new Set(prev);
      if (prev.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }

      return newIndices;
    });
  };

  // Logic for determining row content
  const rowRenderer: ListRowRenderer = ({ parent, index, key, style }) => (
    <CellMeasurer
      cache={rowHeightCache}
      parent={parent}
      key={key}
      rowIndex={index}
      columnIndex={0}
    >
      {({ registerChild }) => (
        <div
          ref={registerChild}
          key={key}
          style={{
            ...style,
            padding: '0.3rem 0',
          }}
        >
          {index < listData.length ? (
            // Index in data range, build a tournament list item
            <TournamentListItem
              tournament={listData[index].data}
              isExpanded={expandedRowIndices.has(index)}
              onClick={() => {
                toggleRowIsExpanded(index);
                requestFullItem(listData[index]);
              }}
            />
          ) : (
            // Index out of data range, show last row
            <span>{canRequestNextPage ? 'Loading...' : 'No more results'}</span>
          )}
        </div>
      )}
    </CellMeasurer>
  );

  const noRowsRenderer = () => (
    // TODO: this should be a component
    <div>
      <span>This query returned no content!</span>
    </div>
  );

  const isRowLoaded = useCallback(
    ({ index }: { index: number }) => index < listData.length,
    [listData]
  );

  // When initial data changes, collapse all rows and recalculate dynamic row heights
  useEffect(() => {
    setExpandedRowIndices(new Set());
    rowHeightCache.clearAll();
    setListData(mapItemData(tournaments));
  }, [tournaments]);

  return (
    <WindowScroller ref={windowScrollerRef}>
      {({
        height,
        width,
        isScrolling,
        onChildScroll,
        scrollTop,
        registerChild: registerWinScrollChild,
      }) => (
        <InfiniteLoader
          threshold={5}
          isRowLoaded={isRowLoaded}
          loadMoreRows={requestNextPage}
          rowCount={listData.length + 1}
        >
          {({ onRowsRendered, registerChild }) => (
            <div ref={registerWinScrollChild as any}>
              <List
                autoHeight
                autoWidth
                ref={registerChild}
                onRowsRendered={(...args) => {
                  onRowsRendered(...args);
                  if (windowScrollerRef.current) {
                    // Hack to dynamically update the vertical position of the list
                    // when things like the expandable filter change the height.
                    // Could be a point to optimize in the future if needed
                    windowScrollerRef.current.updatePosition();
                  }
                }}
                noRowsRenderer={noRowsRenderer}
                height={height}
                width={width}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                scrollTop={scrollTop}
                rowCount={listData.length + 1}
                deferredMeasurementCache={rowHeightCache}
                rowHeight={rowHeightCache.rowHeight}
                rowRenderer={rowRenderer}
              />
            </div>
          )}
        </InfiniteLoader>
      )}
    </WindowScroller>
  );
}
