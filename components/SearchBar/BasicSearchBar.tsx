'use client';

import SearchIcon from '@/public/icons/search.svg';
import styles from './BasicSearchBar.module.css';
import clsx from 'clsx';

export default function BasicSearchBar() {
  return (
    <div className={styles.searchBar}>
      <input
        className={clsx(
          'formField'
        )}
        placeholder='Search'
      >
      </input>
    </div>
  );
}