import { TeamEnumHelper } from '@/lib/enums';
import {
  GameDTO,
  GameWinRecordDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import styles from './GamesListItem.module.css';

export default function GamesListItemFooter({ data }: { data: GameDTO }) {
  const isProvisional = !data.winRecord;
  // TODO: rewrite
  const winRecord = data.winRecord ?? createProvisionalWinRecord(data);

  const redScore =
    winRecord.winnerTeam === Team.Red
      ? winRecord.winnerScore
      : winRecord.loserScore;
  const blueScore =
    winRecord.winnerTeam === Team.Blue
      ? winRecord.winnerScore
      : winRecord.loserScore;

  const winDifference = winRecord.winnerScore - winRecord.loserScore;

  const winnerTeam = TeamEnumHelper.getMetadata(winRecord.winnerTeam);

  return (
    <div className={styles.gameFooter}>
      <div className={styles.scoreResultGrid}>
        <span
          className={styles.score}
          id={'redScore'}
          data-winner={winnerTeam.text.toLowerCase() === 'red'}
        >
          {redScore.toLocaleString()}
        </span>
        <span
          className={styles.score}
          id={'blueScore'}
          data-winner={winnerTeam.text.toLowerCase() === 'blue'}
        >
          {blueScore.toLocaleString()}
        </span>
        <span className={styles.winnerTeam}>
          {winnerTeam.text.toLowerCase() === 'red' &&
            `${winnerTeam.text} wins by ${winDifference.toLocaleString()}`}
        </span>
        <span className={styles.winnerTeam}>
          {winnerTeam.text.toLowerCase() === 'blue' &&
            `${winnerTeam.text} wins by ${winDifference.toLocaleString()}`}
        </span>
      </div>
      {isProvisional && (
        <span className={styles.provisional}>
          game outcome is provisional &#40;no stats generated yet&#41;
        </span>
      )}
    </div>
  );
}

// TODO: remove
function createProvisionalWinRecord(game: GameDTO): GameWinRecordDTO {
  const blueScore = game.scores
    .filter((s) => s.team === Team.Blue)
    .reduce((total, s) => total + s.score, 0);
  const redScore = game.scores
    .filter((s) => s.team === Team.Red)
    .reduce((total, s) => total + s.score, 0);

  if (blueScore > redScore) {
    return {
      gameId: game.id,
      loserRoster: [],
      loserScore: redScore,
      loserTeam: Team.Red,
      winnerRoster: [],
      winnerScore: blueScore,
      winnerTeam: Team.Blue,
    };
  } else {
    return {
      gameId: game.id,
      loserRoster: [],
      loserScore: blueScore,
      loserTeam: Team.Blue,
      winnerRoster: [],
      winnerScore: redScore,
      winnerTeam: Team.Red,
    };
  }
}
