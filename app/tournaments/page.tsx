import TournamentsList from '@/components/Tournaments/TournamentsList/TournamentsList';
import styles from './page.module.css';

export const revalidate = 60;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default function page({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>All tournaments</h1>
        <TournamentsList params={searchParams} /* data={leaderboardData} */ />
      </div>
    </main>
  );
}
