'use client';

import { getTournamentList } from '@/app/actions/tournaments';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext';
import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import { PaginationProps } from '@/lib/types';
import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';
import { useEffect, useRef, useState } from 'react';
import {
  CellMeasurer,
  CellMeasurerCache,
  InfiniteLoader,
  List,
  ListRowRenderer,
  WindowScroller,
} from 'react-virtualized';
import TournamentListHeader from './TournamentListHeader';
import Link from 'next/link';

export default function TournamentList({
  tournaments = [],
  page = 1,
  pageSize = 20,
}: {
  tournaments: TournamentDTO[];
} & PaginationProps) {
  // Manage list data fetching
  const { filter } = useTournamentListFilter();
  const [listData, setListData] = useState(tournaments);

  const [pageNumber, setPageNumber] = useState(page);
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
        page: pageNumber + 1,
      });

      // Update pagination props
      setCanRequestNextPage(nextPage.length === pageSize);
      setPageNumber((prev) => prev + 1);

      // Update results
      setListData((prev) => [...prev, ...nextPage]);
    } catch (e) {
      console.log(e);
      // TODO: toast
      // If there is an error, freeze infinite scrolling until refresh
      setCanRequestNextPage(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const windowScrollerRef = useRef<WindowScroller>(null);

  // State to control dynamic row heights
  const rowHeightCache = new CellMeasurerCache({ fixedWidth: true });

  const isRowLoaded = ({ index }: { index: number }) =>
    !canRequestNextPage || index < listData.length;

  // Logic for determining row content
  const rowRenderer: ListRowRenderer = ({ parent, index, key, style }) => (
    <CellMeasurer
      cache={rowHeightCache}
      parent={parent}
      key={key}
      rowIndex={index}
      columnIndex={0}
    >
      {({ registerChild }) => {
        let content;

        if (isRowLoaded({ index })) {
          content = (
            <Link href={`/tournaments/${listData[index].id}`}>
              <TournamentListItem data={listData[index]} />
            </Link>
          );
        } else {
          content = <span>Loading...</span>;
        }

        return (
          <div
            ref={registerChild}
            key={key}
            style={{
              ...style,
              padding: '0.3rem 0',
            }}
          >
            {content}
          </div>
        );
      }}
    </CellMeasurer>
  );

  const noRowsRenderer = () => (
    // TODO: this should be a component, can be shared with other lists
    <div>
      <span>This query returned no content!</span>
    </div>
  );

  const rowCount = canRequestNextPage ? listData.length + 1 : listData.length;

  // When initial data changes, collapse all rows and recalculate dynamic row heights
  useEffect(() => {
    setListData(tournaments);
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
          rowCount={rowCount}
        >
          {({ onRowsRendered, registerChild }) => (
            <div>
              {/* TODO: Fix padding between header and list */}
              <div>
                <TournamentListHeader />
              </div>
              <div ref={registerWinScrollChild as any}>
                <List
                  autoHeight
                  autoWidth
                  ref={registerChild}
                  onRowsRendered={onRowsRendered}
                  height={height}
                  width={width}
                  isScrolling={isScrolling}
                  onScroll={onChildScroll}
                  scrollTop={scrollTop}
                  rowCount={rowCount}
                  deferredMeasurementCache={rowHeightCache}
                  rowHeight={rowHeightCache.rowHeight}
                  noRowsRenderer={noRowsRenderer}
                  rowRenderer={rowRenderer}
                />
              </div>
            </div>
          )}
        </InfiniteLoader>
      )}
    </WindowScroller>
  );
}
