import styles from './page.module.css';
import { getTournament } from '@/app/actions/tournaments';
import TournamentPageContent from '@/components/Tournaments/TournamentPageContent';

export const revalidate = 60;

export async function generateMetadata({
  params: { id },
}: {
  params: { id: number };
}) {
  const tournament = await getTournament({ id, verified: true });

  return { title: tournament.name };
}

export default async function Page({
  params: { id },
}: {
  params: { id: number };
}) {
  const tournament = await getTournament({ id, verified: false });

  return (
    <main className={styles.container}>
      <TournamentPageContent tournament={tournament} />
    </main>
  );
}
