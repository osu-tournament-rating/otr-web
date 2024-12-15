'use client';

import styles from './TournamentList.module.css';
import TournamentListItem from '@/components/Tournaments/TournamentList/TournamentListItem';
import clsx from 'clsx';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';
import { useInView } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function TournamentList() {
  const endOfPageRef = useRef(null);
  const endOfPageInView = useInView(endOfPageRef);

  const {
    tournaments,
    canRequestNextPage,
    requestNextPage
  } = useTournamentListData();

  useEffect(() => {
    if (canRequestNextPage && endOfPageInView) {
      requestNextPage();
    }
  }, [canRequestNextPage, endOfPageInView, requestNextPage]);

  return (
    <div className={styles.gridList}>
      <div className={clsx(
        styles.row,
        styles.collapsed,
        styles.columnHeadings
      )}>
        <span>Name</span>
        <span>Format</span>
        <span>Ruleset</span>
        <span>Submitter</span>
        <span>Date</span>
      </div>
      {tournaments.map(tournament => {
        return (
          <TournamentListItem key={tournament.id} tournament={tournament} />
        );
      })}
      <div className={clsx(
        styles.row,
        styles.collapsed,
        styles.columnHeadings
      )}>
        {/*
          * TODO: improve bottom of the page
          * animate while requesting |
         */}
        {canRequestNextPage
          ? (
            <span ref={endOfPageRef}>
            Loading...
            </span>
          )
          : (
            <span>
            No more results!
            </span>
          )
        }
      </div>
    </div>
  )
}