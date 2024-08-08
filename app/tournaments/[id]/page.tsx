import styles from './page.module.css';

export const revalidate = 60;

import { fetchTournamentPage } from '@/app/actions';
import MatchesList from '@/components/Tournaments/Lists/MatchesList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tournaments',
};

export default async function page({
  params: { id },
}: {
  params: { id: string | number };
}) {
  const tournamentData = await fetchTournamentPage(id);
  console.log(tournamentData);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{tournamentData?.name}</h1>
        <MatchesList data={tournamentData?.matches} />
      </div>
    </main>
  );
}
