'use client';

import styles from './BasicSearchBar.module.css';
import { DetailedHTMLProps, InputHTMLAttributes } from 'react';

// TODO: Place the search icon inside the search bar
export default function BasicSearchBar(props: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) {
  return (
    <div className={styles.searchBar}>
      <input
        {...props}
        className={'formField'}
      />
    </div>
  );
}
