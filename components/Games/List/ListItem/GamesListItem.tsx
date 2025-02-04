'use client';

import GamesListItemFooter from '@/components/Games/List/ListItem/GamesListItemFooter';
import GamesListItemHeader from '@/components/Games/List/ListItem/GamesListItemHeader';
import GameScore from '@/components/Scores/GameScore';
import {
  GameDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import { Fragment } from 'react';
import styles from './GamesListItem.module.css';

export default function GamesListItem({
  data,
  players,
}: {
  data: GameDTO;
  players: PlayerCompactDTO[];
}) {
  let nNoTeam = 0,
    nRed = 0,
    nBlue = 0;

  return (
    <div className={styles.gameContainer}>
      <GamesListItemHeader data={data} />
      <div className={styles.scoresContainer}>
        {data.scores
          .toSorted((a, b) => b.score - a.score)
          .toSorted((a, b) => a.team - b.team)
          .map((score) => {
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
              <Fragment key={score.id}>
                <GameScore
                  row={row}
                  data={score}
                  player={players.find(
                    (player) => player.id === score.playerId
                  )}
                />
              </Fragment>
            );
          })}
      </div>
      <GamesListItemFooter data={data} />
    </div>
  );
}
