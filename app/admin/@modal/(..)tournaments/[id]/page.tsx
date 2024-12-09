import { fetchTournamentPage } from '@/app/actions';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import MatchesList from '@/components/Tournaments/Lists/MatchesList';
import styles from './modalTournament.module.css';
import { getTournament } from '@/app/actions/tournaments';

export default async function TournamentModal({
  params: { id },
}: {
  params: { id: number };
}) {
  const tournament = await getTournament({ id, verified: false });

  return (
    <div className={styles.modal}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>{tournament.name}</h1>
            <div className={styles.date}>Missing Date</div>
          </div>
          <TournamentInfoContainer data={tournament} />
          <MatchesList data={tournament.matches} />
        </div>
      </div>
    </div>
  );
}
