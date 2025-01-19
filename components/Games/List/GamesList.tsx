'use client';

import {
  GameDTO,
  PlayerCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import styles from './GamesList.module.css';
import GamesListItem from '@/components/Games/List/ListItem/GamesListItem';

export default function GamesList({
  data,
  players,
}: {
  data: GameDTO[];
  players: PlayerCompactDTO[];
}) {
  return (
    <div className={styles.gameListContainer}>
      {data.map((game) => (
        <GamesListItem
          key={game.id}
          data={game}
          players={players.filter((player) =>
            game.scores.map((s) => s.playerId).includes(player.id)
          )}
        />
      ))}
    </div>
  );
}
