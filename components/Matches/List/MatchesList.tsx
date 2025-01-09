'use client';

import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import MatchesListItem from './MatchesListItem';

export default function MatchesList({ data }: { data: MatchDTO[] }) {
  return (
    <div className={styles.gridList}>
      {data.map((match) => (
        <div key={match.id}>
          <MatchesListItem data={match} isExpanded={false} onClick={() => {}} />
        </div>
      ))}
    </div>
  );
}
