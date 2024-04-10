'use client';

import searchIcon from '@/public/icons/search.svg';
import Image from 'next/image';
import { useState } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className={styles.container}>
      <div className={styles.body}>
        <form action="" className={styles.bar}>
          <input
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <div className={styles.icon}>
            <Image src={searchIcon} alt={'search icon'} fill />
          </div>
        </form>
        <div className={styles.content}>
          <h3 className={styles.header}>Players</h3>
          <div className={styles.list}>
            <div className={styles.item}>Broccolo21</div>
            <div className={styles.item}>Broccolo il superbo</div>
          </div>
        </div>
        <div className={styles.content}>
          <h3 className={styles.header}>Tournaments</h3>
          <div className={styles.list}>
            <div className={styles.item}>Broccolo Cup</div>
            <div className={styles.item}>Broccolo Capocchia</div>
            <div className={styles.item}>Broccolo Verde Cup</div>
          </div>
        </div>
      </div>
    </div>
  );
}
