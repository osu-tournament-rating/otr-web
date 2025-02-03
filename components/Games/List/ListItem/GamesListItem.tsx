'use client';

import { GameDTO, PlayerCompactDTO, Team } from '@osu-tournament-rating/otr-api-client';
import styles from './GamesListItem.module.css';
import clsx from 'clsx';
import GamesListItemHeader from '@/components/Games/List/ListItem/GamesListItemHeader';
import GameScore from '@/components/Scores/GameScore';
import GamesListItemFooter from '@/components/Games/List/ListItem/GamesListItemFooter';
import { Attributes } from 'react';

export default function GamesListItem({
  data,
  players,
  key,
}: {
  data: GameDTO;
  players: PlayerCompactDTO[];
} & Pick<Attributes, 'key'>) {
  let nNoTeam = 0,
    nRed = 0,
    nBlue = 0;

  return (
    <div key={key} className={clsx('content', styles.gameContainer)}>
      <GamesListItemHeader data={data} />
      <div className={styles.scoresContainer}>
        {data.scores.toSorted((a, b) => a.team - b.team).map((score) => {
          let row = 1;
          switch (score.team) {
            case Team.NoTeam:
              row += nNoTeam++;
              break;
            case Team.Red:
              row += nNoTeam + nRed++;
              break;
            case Team.Blue:
              row += nNoTeam + nBlue++;
              break;
          }

          return (
            <GameScore
              row={row}
              key={score.id}
              data={score}
              player={players.find((player) => player.id === score.playerId)}
            />
          );
        })}
      </div>
      <GamesListItemFooter data={data} />
    </div>
  );
}
