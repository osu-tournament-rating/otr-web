'use client';

import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';
import { useCallback, useRef, useState } from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  InfiniteLoader,
  List,
  ListRowProps,
  WindowScroller,
} from 'react-virtualized';

export default function TournamentList() {
  const { tournaments, canRequestNextPage, requestNextPage } =
    useTournamentListData();

  const windowScrollerRef = useRef<WindowScroller>(null);

  // State to control dynamic row heights
  const [expandedRowIndices, setExpandedRowIndices] = useState<Set<number>>(new Set());
  const rowHeightCache = useRef(
    new CellMeasurerCache({ fixedWidth: true })
  );

  const toggleRowIsExpanded = (index: number) => {
    setExpandedRowIndices((prev) => {
      const newIndices = new Set(prev);
      if (prev.has(index)) {
        newIndices.delete(index);
      } else {
        newIndices.add(index);
      }

      rowHeightCache.current.clear(index, 0);
      return newIndices;
    })
  }

  // Logic for determining row content
  const rowRenderer = ({ parent, index, key, style }: ListRowProps) => (
    <CellMeasurer
      cache={rowHeightCache.current}
      parent={parent}
      key={key}
      rowIndex={index}
      columnIndex={0}
    >
      <div
        key={key}
        style={{
          ...style,
          padding: '0.3rem 0'
        }}
      >
        {index < tournaments.length ? (
          // Index in data range, build a tournament list item
          <TournamentListItem
            tournament={tournaments[index]}
            isExpanded={expandedRowIndices.has(index)}
            onClick={() => toggleRowIsExpanded(index)}
          />
        ) : (
          // Index out of data range, show last row
          <span>{canRequestNextPage ? 'Loading...' : 'No more results'}</span>
        )}
      </div>
    </CellMeasurer>
  );

  const isRowLoaded = useCallback(
    ({ index }: { index: number }) => index < tournaments.length,
    [tournaments]
  );

  return (
    <InfiniteLoader
      threshold={5}
      isRowLoaded={isRowLoaded}
      loadMoreRows={() => {
        // Store final index before requesting, as the length will likely change
        const prevFinalItemIdx = tournaments.length;
        requestNextPage().then(() => {
          // After requesting, recalculate the height of the final item
          // (which used to be the 'loading...' placeholder row
          rowHeightCache.current.clear(prevFinalItemIdx, 0);
        });

        return Promise.resolve();
      }}
      rowCount={tournaments.length + 1}
    >
      {({ onRowsRendered, registerChild }) => (
        <WindowScroller ref={windowScrollerRef}>
          {({ height, isScrolling, onChildScroll, scrollTop }) => (
            <AutoSizer disableHeight>
              {({ width }) => (
                <List
                  autoHeight
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
                  height={height}
                  width={width}
                  isScrolling={isScrolling}
                  onScroll={onChildScroll}
                  scrollTop={scrollTop}
                  rowCount={tournaments.length + 1}
                  deferredMeasurementCache={rowHeightCache.current}
                  rowHeight={rowHeightCache.current.rowHeight}
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
