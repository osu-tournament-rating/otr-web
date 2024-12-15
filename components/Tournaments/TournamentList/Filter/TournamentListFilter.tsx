'use client';

import styles from './TournamentListFilter.module.css';
import FilterIcon from '@/public/icons/Filter.svg';
import BasicSearchBar from '@/components/SearchBar/BasicSearchBar';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import TournamentListFilterCollapsible from '@/components/Tournaments/TournamentList/Filter/TournamentListFilterCollapsible';

export default function TournamentListFilter() {
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);

  return (
    <div className={styles.filterContainer}>
      <div className={styles.searchBarContainer} >
        <BasicSearchBar />
        {/**
         * TODO: Style this to fit the div instead of 'height: 3rem' ?
         * I couldn't figure out a better way to do it :P
         */}
        <button
          className={styles.filterButton}
          onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
        >
          <FilterIcon className={'fill'}/>
        </button>
      </div>
      <AnimatePresence>
        {isCollapsibleOpen && <TournamentListFilterCollapsible />}
      </AnimatePresence>
    </div>
  );
}