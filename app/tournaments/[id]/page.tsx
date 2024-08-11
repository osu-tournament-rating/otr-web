import styles from './page.module.css';

export const revalidate = 60;

import { fetchTournamentPage } from '@/app/actions';
import InfoContainer from '@/components/Tournaments/InfoContainer/InfoContainer';
import MatchesList from '@/components/Tournaments/Lists/MatchesList';
import type { Metadata } from 'next';

export async function generateMetadata({
  params: { id },
}: {
  params: { id: string | number };
}) {
  let tournament = await fetchTournamentPage(id);

  return {
    title: tournament !== null ? `${tournament?.name}` : 'User profile',
  };
}

export default async function page({
  params: { id },
}: {
  params: { id: string | number };
}) {
  const tournamentData = await fetchTournamentPage(id);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{tournamentData?.name}</h1>
          <div className={styles.date}>Missing Date</div>
        </div>
        <InfoContainer data={tournamentData} />
        <MatchesList data={tournamentData?.matches} />
      </div>
    </main>
  );
}
