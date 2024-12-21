'use client';

import styles from './TournamentList.module.css';
import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import clsx from 'clsx';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';
import { useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { AutoSizer, List, WindowScroller } from 'react-virtualized';

export default function TournamentList() {
  const endOfPageRef = useRef(null);
  const endOfPageInView = useInView(endOfPageRef);

  const { tournaments, canRequestNextPage, requestNextPage } =
    useTournamentListData();

  // useEffect(() => {
  //   if (canRequestNextPage && endOfPageInView) {
  //     requestNextPage();
  //   }
  // }, [canRequestNextPage, endOfPageInView, requestNextPage]);

  return (
    <WindowScroller>
      {({ height, isScrolling, onChildScroll, scrollTop }) => (
        <AutoSizer disableHeight>
          {({ width })=> (
            <List
              autoHeight
              height={height}
              isScrolling={isScrolling}
              onScroll={onChildScroll}
              scrollTop={scrollTop}
              width={width}
              rowCount={tournaments.length}
              rowHeight={64}
              rowRenderer={({ index, style }) => (
                <div
                  key={tournaments[index].id}
                  style={style}>
                  <TournamentListItem tournament={tournaments[index]} />
                </div>
              )}
            />
          )}
        </AutoSizer>
      )}
    </WindowScroller>
  );
}
