'use client';

import styles from './TournamentListFilter.module.css';
import FilterIcon from '@/public/icons/Filter.svg';
import BasicSearchBar from '@/components/SearchBar/BasicSearchBar';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import TournamentListFilterCollapsible from '@/components/Tournaments/TournamentList/Filter/TournamentListFilterCollapsible';
import { useTournamentListFilter } from '@/components/Context/TournamentListFilterContext';

export default function TournamentListFilter() {
  const {
    filter: { searchQuery },
    setFilterValue,
  } = useTournamentListFilter();
  const [searchBarValue, setSearchBarValue] = useState(searchQuery);
  const [searchUpdateAction, setSearchUpdateAction] = useState<
    NodeJS.Timeout | undefined
  >(undefined);
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(false);

  // Handle debouncing search bar
  const handleSetSearchQuery = (value: string | undefined) => {
    // Immediately set the front-facing value
    if (value === '') {
      value = undefined;
    }
    setSearchBarValue(value);

    // Cancel the current queued update if possible
    if (searchUpdateAction) {
      clearTimeout(searchUpdateAction);
    }

    // Queue the filter update
    setSearchUpdateAction(
      setTimeout(() => {
        setFilterValue('searchQuery', value);
      }, 500)
    );
  };

  return (
    <div className={styles.filterContainer}>
      <div className={styles.searchBarContainer}>
        <BasicSearchBar
          placeholder={'Search'}
          value={searchBarValue}
          onChange={(e) => handleSetSearchQuery(e.target.value)}
        />
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
