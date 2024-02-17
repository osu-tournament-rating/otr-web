'use client';
import { useUser } from '@/util/hooks';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../NavBar.module.css';

export default function Routes() {
  let pathname = usePathname();
  const user = useUser();

  return (
    <div className={styles.routes}>
      {user?.osuId && (
        <Link
          href={'/dashboard'}
          className={pathname === '/dashboard' ? styles.active : ''}
        >
          Dashboard
        </Link>
      )}
      <Link
        href={'/leaderboards'}
        className={pathname === '/leaderboards' ? styles.active : ''}
      >
        Leaderboards
      </Link>
      {user?.osuId && (
        <Link
          href={'/submit'}
          className={pathname === '/submit' ? styles.active : ''}
        >
          Submit Matches
        </Link>
      )}
    </div>
  );
}
