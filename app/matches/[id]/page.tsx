import { fetchMatchPage } from '@/app/actions';
import styles from './page.module.css';
import MatchesPageContent from '@/components/Matches/MatchPageContent';

export default async function page({
  params: { id },
}: {
  params: { id: string | number };
}) {
  const match = await fetchMatchPage(id);

  return (
    <main className={styles.container}>
      <MatchesPageContent match={match} showTournament />
    </main>
  );
}
