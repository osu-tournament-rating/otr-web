'use client';

import GameCardHeader from './GameCardHeader';
import ScoreCard from './ScoreCard';
import { TeamEnumHelper } from '@/lib/enum-helpers';
import { Game, GameScore, MatchPlayer } from '@/lib/orpc/schema/match';
import { Team } from '@otr/core/osu';
import { cn } from '@/lib/utils';

type ScoreMapItem = {
  score: GameScore;
  /** Beat the other team's score in the same slot. */
  won?: boolean;
};

type ScoreMap = Partial<Record<Team, ScoreMapItem[]>>;

export default function GameCard({
  game,
  players = [],
  highlighted = false,
  highlightScoreId = null,
}: {
  game: Game;
  players: MatchPlayer[];
  highlighted?: boolean;
  highlightScoreId?: number | null;
}) {
  const scoreMap: ScoreMap = {};

  game.scores
    .sort((a, b) => b.score - a.score)
    .forEach((s) => {
      const teamKey = s.team as Team;
      if (!scoreMap[teamKey]) {
        scoreMap[teamKey] = [];
      }

      scoreMap[teamKey]!.push({ score: s });
    });

  const teamMaps = Object.values(scoreMap).filter(Boolean) as ScoreMapItem[][];

  const nScores = teamMaps.reduce(
    (max, cur) => (cur.length > max.length ? cur : max),
    []
  ).length;

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

  Object.keys(scoreMap).forEach((key) => {
    const teamValue = parseInt(key, 10);

    if (isNaN(teamValue) || Team[teamValue] === undefined) {
      return;
    }

    const currentTeam = teamValue as Team;

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
    outcomeText = `Team ${TeamEnumHelper.getMetadata(team1).text} wins`;
  }

  const redTeamScores = scoreMap[Team.Red] || [];
  const blueTeamScores = scoreMap[Team.Blue] || [];
  const noTeamScores = scoreMap[Team.NoTeam] || [];

  return (
    <div
      id={`game-${game.id}`}
      className={cn(
        'flex flex-col space-y-2 rounded-xl bg-secondary p-3 transition-all duration-300',
        highlighted && 'ring-2 ring-yellow-400 ring-offset-2'
      )}
    >
      <GameCardHeader game={game} />
      {game.scores.length === 0 ? (
        <div className="rounded-md border border-neutral-300 p-4 text-center dark:border-neutral-700">
          <p className="text-gray-600 dark:text-gray-400">
            No scores available
          </p>
        </div>
      ) : (
        <div className="flex flex-row flex-wrap gap-1 lg:gap-0">
          <div data-team="Red" className="team-container flex flex-col gap-1">
            {redTeamScores.map(({ score }: ScoreMapItem) => (
              <ScoreCard
                key={score.id}
                score={score}
                player={players.find((p) => p.id === score.playerId)}
                highlighted={score.id === highlightScoreId}
              />
            ))}

            {noTeamScores.length > 0 && (
              <div
                data-team="NoTeam"
                className="team-container flex flex-col gap-1"
              >
                {noTeamScores.map(({ score }: ScoreMapItem) => (
                  <ScoreCard
                    key={score.id}
                    score={score}
                    player={players.find((p) => p.id === score.playerId)}
                    highlighted={score.id === highlightScoreId}
                  />
                ))}
              </div>
            )}
          </div>

          <div data-team="Blue" className="team-container flex flex-col gap-1">
            {blueTeamScores.map(({ score }: ScoreMapItem) => (
              <ScoreCard
                key={score.id}
                score={score}
                player={players.find((p) => p.id === score.playerId)}
                highlighted={score.id === highlightScoreId}
              />
            ))}
          </div>
        </div>
      )}
      {outcomeText && (
        <div
          data-testid="game-outcome"
          className="mt-2 rounded-md border border-neutral-300 p-2 text-center dark:border-neutral-700"
        >
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
                    : 'text-gray-900 dark:text-gray-100'
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
