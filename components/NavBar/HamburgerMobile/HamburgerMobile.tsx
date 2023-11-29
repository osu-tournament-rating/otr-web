'use client';
import Link from 'next/link';
import { useState } from 'react';
import styles from './HamburgerMobile.module.css';

export default function HamburgerMobile() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className={styles.hamburger}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>☰</span>
      </div>
      {isOpen && (
        <div className={styles.dropdown}>
          <Link
            href={'/dashboard'}
            className={styles.item}
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href={'/leaderboards'}
            className={styles.item}
            onClick={() => setIsOpen(false)}
          >
            Leaderboards
          </Link>
          <Link
            href={'/submit'}
            className={styles.item}
            onClick={() => setIsOpen(false)}
          >
            Submit Matches
          </Link>
          <Link
            href={'/donate'}
            className={styles.item}
            onClick={() => setIsOpen(false)}
          >
            Donate
          </Link>
        </div>
      )}
    </>
  );
}
