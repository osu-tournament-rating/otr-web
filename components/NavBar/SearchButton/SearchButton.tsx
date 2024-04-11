'use client';

import SearchBar from '@/components/SearchBar/SearchBar';
import searchIcon from '@/public/icons/search.svg';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import styles from './SearchButton.module.css';

export default function SearchButton() {
  const [isSeachBarOpen, setIsSeachBarOpen] = useState(false);
  useHotkeys('ctrl+k', (e) => {
    e.preventDefault();
    setIsSeachBarOpen((prev) => !prev);
  });

  return (
    <>
      <div
        className={styles.searchButton}
        onClick={() => setIsSeachBarOpen((prev) => !prev)}
      >
        <Image src={searchIcon} alt={'search'} fill />
      </div>
      {isSeachBarOpen && <SearchBar setIsSeachBarOpen={setIsSeachBarOpen} />}
    </>
  );
}
