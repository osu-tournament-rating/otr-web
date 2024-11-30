import AdminTournamentsList from '@/components/Tournaments/Lists/AdminTournamentsList';
import Cup from '@/public/icons/Cup.svg';
import User from '@/public/icons/User.svg';
import clsx from 'clsx';
import { fetchTournamentsForAdminPage } from '../actions';
import styles from './page.module.css';

export const revalidate = 60;

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel',
};

export default async function page({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const tournamentsData = await fetchTournamentsForAdminPage(searchParams);

  console.log(tournamentsData);

  return (
    <main className={styles.container}>
      <div className={styles.leftNavigationContainer}>
        <div className={styles.navigation}>
          <Cup className={clsx('fill', styles.active)} />
          <User className={clsx('fill')} />
        </div>
      </div>
      <div className={styles.content}>
        <h1 className={styles.title}>Tournaments</h1>
        {<AdminTournamentsList data={tournamentsData} />}
      </div>
    </main>
  );
}
