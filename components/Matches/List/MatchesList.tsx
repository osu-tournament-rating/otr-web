'use client';

import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import MatchesListItem from './MatchesListItem';
import Link from 'next/link';

export default function MatchesList({ data }: { data: MatchDTO[] }) {
  return (
    <div className={styles.gridList}>
      {data.map((match) => (
        <Link key={match.id} href={`/matches/${match.id}`}>
          <MatchesListItem data={match} />
        </Link>
      ))}
    </div>
  );
}
