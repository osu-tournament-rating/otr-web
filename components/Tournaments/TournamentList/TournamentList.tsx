'use client';

import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';
import { useInView } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { AutoSizer, InfiniteLoader, List, ListRowProps, WindowScroller } from 'react-virtualized';

export default function TournamentList() {
  const endOfPageRef = useRef(null);
  const endOfPageInView = useInView(endOfPageRef);

  const { tournaments, canRequestNextPage, requestNextPage } =
    useTournamentListData();
  
  const rowRenderer = ({ index, key, style }: ListRowProps) => (
    <div key={key} style={style}>
      {index < tournaments.length ? (
        // Index in data range, build a tournament list item
        <TournamentListItem tournament={tournaments[index]} />
      ) : (
        // Index out of data range, show last row
        <span>{canRequestNextPage ? 'Loading...' : 'No more results'}</span>
      )}
    </div>
  );

  const isRowLoaded = useCallback(
    ({ index }: { index: number }) => index < tournaments.length,
    [tournaments]
  );

  return (
    <InfiniteLoader
      threshold={5}
      isRowLoaded={isRowLoaded}
      loadMoreRows={requestNextPage}
      rowCount={tournaments.length + 1}
    >
      {({ onRowsRendered, registerChild }) => (
        <WindowScroller>
          {({ height, isScrolling, onChildScroll, scrollTop }) => (
            <AutoSizer disableHeight>
              {({ width }) => (
                <List
                  autoHeight
                  ref={registerChild}
                  onRowsRendered={onRowsRendered}
                  height={height}
                  isScrolling={isScrolling}
                  onScroll={onChildScroll}
                  scrollTop={scrollTop}
                  width={width}
                  rowCount={tournaments.length + 1}
                  rowHeight={64}
                  rowRenderer={rowRenderer}
                />
              )}
            </AutoSizer>
          )}
        </WindowScroller>
      )}
    </InfiniteLoader>
  );
}
