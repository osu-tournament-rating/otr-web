'use client';

import styles from './TournamentPageContent.module.css';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import MatchesList from '@/components/Tournaments/Lists/MatchesList';
import { TournamentDTO } from '@osu-tournament-rating/otr-api-client';

export default function TournamentPageContent({
  tournament
}: {
  tournament: TournamentDTO
}) {
  return (
    <div className={styles.container}>
      <TournamentInfoContainer data={tournament} showName={false} />
      <MatchesList data={tournament.matches} />
    </div>
  );
}