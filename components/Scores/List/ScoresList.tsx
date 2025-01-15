'use client';

import { GameScoreDTO, PlayerCompactDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import Link from 'next/link';
import ScoresListItem from './ScoresListItem';

export default function ScoresList({ data, players = [] }: { data: GameScoreDTO[]; players?: PlayerCompactDTO[] }) {
  return (
    <div className={styles.gridList}>
      {data.map((score, idx) => (
        <Link key={score.id} href={`/scores/${score.id}`}>
          <ScoresListItem data={score} player={players.find(p => p.id === score.playerId)} />
        </Link>
      ))}
    </div>
  );
}
