'use client';

import searchIcon from '@/public/icons/search.svg';
import { useClickAway } from '@uidotdev/usehooks';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from './SearchBar.module.css';

export default function SearchBar({ setIsSeachBarOpen }) {
  const [searchValue, setSearchValue] = useState('');
  const ref = useClickAway(() => {
    setIsSeachBarOpen(false);
  });

  return (
    <div className={styles.container}>
      <div className={styles.body} ref={ref}>
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
            <Link href={'/'} className={styles.item}>
              <div className={styles.propic}>
                <Image src={'http://s.ppy.sh/a/4001304'} alt={'Player'} fill />
              </div>
              <div className={styles.username}>
                <span>Broc</span>colo21
              </div>
              <div className={styles.rank}>#24 024</div>
              <div className={styles.rating}>1400 TR</div>
            </Link>
            <div className={styles.item}>Broccolo il superbo</div>
          </div>
        </div>
        <div className={styles.content}>
          <h3 className={styles.header}>Tournaments</h3>
          <div className={styles.list}>
            <div className={styles.item}>Broccolo Cup</div>
            <div className={styles.item}>Broccolo RED</div>
            <div className={styles.item}>Broccolo Verde Cup</div>
          </div>
        </div>
      </div>
    </div>
  );
}
