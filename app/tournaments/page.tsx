import TournamentsList from '@/components/Tournaments/Lists/TournamentsList';
import styles from './page.module.css';

export const revalidate = 60;

import { fetchTournamentsPage } from '@/app/actions';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function page({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const tournamentsData = await fetchTournamentsPage(searchParams);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>All tournaments</h1>
        <TournamentsList params={searchParams} data={tournamentsData} />
      </div>
    </main>
  );
}
