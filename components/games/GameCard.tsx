import {
  GameDTO,
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import GameCardHeader from './GameCardHeader';
import ScoreCard from './ScoreCard';
import { TeamEnumHelper } from '@/lib/enums';

type ScoreMapItem = {
  /** Player score */
  score: GameScoreDTO;

  /**
   * If the score "won" it's "matchup"
   * read: Did it have higher score than the next best on the other team
   */
  won?: boolean;
};

type ScoreMap = { [key in Team]?: ScoreMapItem[] };

export default function GameCard({
  game,
  players = [],
}: {
  game: GameDTO;
  players: PlayerCompactDTO[];
}) {
  const scoreMap: ScoreMap = {};

  // Sort by score and group by team
  game.scores
    .sort((a, b) => b.score - a.score)
    .forEach((s) => {
      if (!(s.team in scoreMap)) {
        scoreMap[s.team] = [];
      }

      scoreMap[s.team]?.push({ score: s });
    });

  // To determine "winning matchups" we don't want to look at teamless scores
  const teamMaps = Object.entries(scoreMap).map(([, scores]) => scores);

  const nScores = teamMaps.reduce((max, cur) =>
    cur.length > max.length ? cur : max
  ).length;

  // Iterate over each "matchup" and compare scores of each team for that slot
  // Mark the highest score as the winner
  for (let i = 0; i < nScores; i++) {
    const matchups = teamMaps
      .map((map) => map.at(i))
      .sort((a, b) => (b?.score?.score ?? 0) - (a?.score?.score ?? 0));

    if (matchups[0] && matchups[0].score.team != Team.NoTeam) {
      matchups[0].won = true;
    }
  }

  const teamScores: { [key in Team]?: number } = {};
  let team1: Team | undefined;
  let team2: Team | undefined;

  Object.keys(scoreMap).forEach((teamKeyString) => {
    const teamEnumValueNumeric = parseInt(teamKeyString, 10);

    if (
      isNaN(teamEnumValueNumeric) ||
      Team[teamEnumValueNumeric] === undefined
    ) {
      return;
    }

    const currentTeam = teamEnumValueNumeric as Team;

    if (currentTeam === Team.NoTeam) {
      return;
    }

    const scores = scoreMap[currentTeam];

    if (!scores) {
      return;
    }

    if (team1 === undefined) {
      team1 = currentTeam;
    } else if (team2 === undefined && currentTeam !== team1) {
      team2 = currentTeam;
    }

    teamScores[currentTeam] = scores.reduce(
      (total, item) => total + item.score.score,
      0
    );
  });

  let outcomeText = '';
  if (team1 && team2 && teamScores[team1] && teamScores[team2]) {
    const score1 = teamScores[team1]!;
    const score2 = teamScores[team2]!;
    const pointDifference = Math.abs(score1 - score2);

    if (score1 > score2) {
      outcomeText = `Team ${TeamEnumHelper.getMetadata(team1).text} wins by ${pointDifference.toLocaleString()}`;
    } else if (score2 > score1) {
      outcomeText = `Team ${TeamEnumHelper.getMetadata(team2).text} wins by ${pointDifference.toLocaleString()}`;
    } else {
      outcomeText = "It's a tie!";
    }
  } else if (team1 && teamScores[team1]) {
    // Case where there's only one team with scores (e.g. solo match or other team forfeited/didn't score)
    outcomeText = `Team ${TeamEnumHelper.getMetadata(team1).text} wins`;
  }

  return (
    <div className="flex flex-col space-y-2 rounded-xl bg-secondary p-3">
      <GameCardHeader game={game} />
      <div className="flex flex-row flex-wrap gap-1 md:gap-0">
        {/* Team containers */}
        {Object.entries(scoreMap).map(([teamKey, scores]) => {
          const teamEnumValue = parseInt(teamKey, 10) as Team;
          if (isNaN(teamEnumValue) || Team[teamEnumValue] === undefined) {
            return null;
          }
          const teamName = TeamEnumHelper.getMetadata(teamEnumValue).text;

          return (
            <div
              key={teamKey}
              data-team={teamName}
              className="team-container flex flex-col gap-1"
            >
              {/* Score cards */}
              {scores.map(({ score, won }) => (
                <ScoreCard
                  key={score.id}
                  score={score}
                  won={won}
                  player={players.find((p) => p.id === score.playerId)}
                />
              ))}
            </div>
          );
        })}
      </div>
      {outcomeText && (
        <div className="mt-2 rounded-md border border-gray-300 p-2 text-center dark:border-gray-700">
          <p
            className={`text-lg font-semibold ${
              outcomeText.includes('wins')
                ? outcomeText.startsWith(
                    `Team ${TeamEnumHelper.getMetadata(Team.Red).text}`
                  )
                  ? 'text-red-600 dark:text-red-400'
                  : outcomeText.startsWith(
                        `Team ${TeamEnumHelper.getMetadata(Team.Blue).text}`
                      )
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-900 dark:text-gray-100' // Fallback for other team names if any
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {outcomeText}
          </p>
        </div>
      )}
    </div>
  );
}
