'use client';

import {
  GameDTO,
  PlayerCompactDTO,
} from '@osu-tournament-rating/otr-api-client';
import styles from './GamesList.module.css';
import GamesListItem from '@/components/Games/List/ListItem/GamesListItem';
import { Fragment } from 'react';

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
        <Fragment key={game.id}>
          <GamesListItem
            data={game}
            players={players.filter((player) =>
              game.scores.map((s) => s.playerId).includes(player.id)
            )}
          />
        </Fragment>
      ))}
    </div>
  );
}
