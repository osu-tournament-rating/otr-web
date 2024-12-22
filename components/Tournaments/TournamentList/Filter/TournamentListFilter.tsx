'use client';

import styles from './TournamentListFilter.module.css';
import FilterIcon from '@/public/icons/Filter.svg';
import BasicSearchBar from '@/components/SearchBar/BasicSearchBar';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import TournamentListFilterCollapsible from '@/components/Tournaments/TournamentList/Filter/TournamentListFilterCollapsible';
import { useTournamentListData } from '@/components/Tournaments/TournamentList/Filter/TournamentListDataContext';

export default function TournamentListFilter() {
  const { filter: { searchQuery }, setFilterValue } = useTournamentListData();
  const [inputSearchValue, setInputSearchValue] = useState(searchQuery);
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);

  return (
    <div className={styles.filterContainer}>
      <div className={styles.searchBarContainer}>
        <BasicSearchBar
          placeholder={'Search'}
          value={inputSearchValue}
          onChange={(e) => {
            setInputSearchValue(e.target.value);
            setFilterValue('searchQuery', searchQuery);
          }}
        />
        {/**
         * TODO: Style this to fit the div instead of 'height: 3rem' ?
         * I couldn't figure out a better way to do it :P
         */}
        <button
          className={styles.filterButton}
          onClick={() => setIsCollapsibleOpen(!isCollapsibleOpen)}
        >
          <FilterIcon className={'fill'} />
        </button>
      </div>
      <AnimatePresence>
        {isCollapsibleOpen && <TournamentListFilterCollapsible />}
      </AnimatePresence>
    </div>
  );
}
