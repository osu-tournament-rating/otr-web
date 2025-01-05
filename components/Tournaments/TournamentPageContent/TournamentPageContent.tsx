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
  data,
  onDataChanged = () => {},
}: {
  data: TournamentDTO;
  onDataChanged?: (data: TournamentCompactDTO) => void;
}) {
  return (
    <div className={styles.container}>
      <TournamentInfoContainer
        data={data}
        showName={false}
        onDataChanged={onDataChanged}
      />
      <MatchesList data={data.matches ?? []} />
    </div>
  );
}
