'use client';

import { GameScoreDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import Link from 'next/link';
import ScoresListItem from './ScoresListItem';

export default function ScoresList({ data }: { data: GameScoreDTO[] }) {
  return (
    <div className={styles.gridList}>
      {data.map((score, idx) => (
        // <Link key={score.id} href={`/scores/${score.id}`}>
        <div key={idx}>
          <ScoresListItem data={score} />
        </div>
        // </Link>
      ))}
    </div>
  );
}
