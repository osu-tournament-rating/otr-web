'use client';

import { GameDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import GamesListRowItem from './GamesListRowItem';
import Link from 'next/link';

export type GamesListItemStyle = 'rows' | 'chips';

export default function GamesList({
  data,
  itemStyle = 'rows',
}: {
  data: GameDTO[];
  itemStyle?: GamesListItemStyle;
}) {
  return (
    <div className={styles.gridList}>
      {data.map((game) => (
        <Link key={game.id} href={`/games/${game.id}`}>
          <GamesListRowItem data={game} />
        </Link>
      ))}
    </div>
  );
}
