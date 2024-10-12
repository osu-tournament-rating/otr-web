import { fetchTournamentPage } from '@/app/actions';
import InfoContainer from '@/components/Tournaments/InfoContainer/InfoContainer';
import MatchesList from '@/components/Tournaments/Lists/MatchesList';
import styles from './modalTournament.module.css';

export default async function TournamentModal({
  params: { id },
}: {
  params: { id: string | number };
}) {
  const tournamentData = await fetchTournamentPage(id);

  return (
    <div className={styles.modal}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>{tournamentData?.name}</h1>
            <div className={styles.date}>Missing Date</div>
          </div>
          <InfoContainer data={tournamentData} />
          <MatchesList data={tournamentData?.matches} />
        </div>
      </div>
    </div>
  );
}
