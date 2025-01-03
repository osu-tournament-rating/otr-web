'use client';

import MatchesList from '@/components/Matches/List/MatchesList';
import styles from './TournamentPageContent.module.css';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import { isFullTournament } from '@/lib/api';
import {
  TournamentCompactDTO,
  TournamentDTO,
} from '@osu-tournament-rating/otr-api-client';

export default function TournamentPageContent({
  tournament,
}: {
  tournament: TournamentCompactDTO | TournamentDTO;
}) {
  const matches = isFullTournament(tournament) ? tournament.matches : [];

  return (
    <div className={styles.container}>
      <TournamentInfoContainer data={tournament} showName={false} />
      <MatchesList data={matches!} />
    </div>
  );
}
