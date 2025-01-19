import styles from './GamesListItem.module.css';
import {
  GameDTO,
  GameWinRecordDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import { TeamEnumHelper } from '@/lib/enums';

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

  return (
    <div className={styles.gameFooter}>
      <h1>{redScore.toLocaleString()} - {blueScore.toLocaleString()}</h1>
      <h1>{TeamEnumHelper.getMetadata(winRecord.winnerTeam).text} Wins by {(winRecord.winnerScore - winRecord.loserScore).toLocaleString()}</h1>
      {isProvisional && (
        <span>game outcome is provisional (no stats generated yet)</span>
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
