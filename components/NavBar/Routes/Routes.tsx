'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../NavBar.module.css';

export default function Routes() {
  let pathname = usePathname();

  return (
    <div className={styles.routes}>
      <Link
        href={'/dashboard'}
        className={pathname === '/dashboard' ? styles.active : ''}
      >
        Dashboard
      </Link>
      <Link
        href={'/leaderboards'}
        className={pathname === '/leaderboards' ? styles.active : ''}
      >
        Leaderboards
      </Link>
      <Link
        href={'/submit'}
        className={pathname === '/submit' ? styles.active : ''}
      >
        Submit Matches
      </Link>
    </div>
  );
}
