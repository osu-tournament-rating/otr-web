import styles from './page.module.css';

export const revalidate = 60;

import type { Metadata } from 'next';
import { getTournamentList } from '@/app/actions/tournaments';
import TournamentList from '@/components/Tournaments/TournamentList/TournamentList';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function Page() {
  const tournaments = await getTournamentList({
    page: 1,
    pageSize: 5,
    verified: false
  });

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>All tournaments</h1>
        <TournamentList tournaments={tournaments} />
      </div>
    </main>
  );
}
