'use client';

import { GameDTO } from '@osu-tournament-rating/otr-api-client';
import styles from '@/components/Tournaments/TournamentList/TournamentList.module.css';
import GamesListRowItem from './GamesListRowItem';

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
        <div key={game.id}>
          <GamesListRowItem data={game} />
        </div>
      ))}
    </div>
  );
}
