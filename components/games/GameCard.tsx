import {
  GameDTO,
  GameScoreDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import GameCardHeader from './GameCardHeader';
import ScoreCard from './ScoreCard';

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
  // Team + Score card placement logic
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
  const teamMaps = Object.entries(scoreMap)
    .filter(([team]) => team !== String(Team.NoTeam))
    .map(([, scores]) => scores);

  // Find the highest number of scores so we have an accurate iterator
  const nScores = teamMaps.reduce((max, cur) =>
    cur.length > max.length ? cur : max
  ).length;

  // Iterate over each "matchup" and compare scores of each team for that slot
  // Mark the highest score as the winner
  for (let i = 0; i < nScores; i++) {
    const matchups = teamMaps
      .map((map) => map.at(i))
      .sort((a, b) => (b?.score?.score ?? 0) - (a?.score?.score ?? 0));

    if (matchups[0]) {
      matchups[0].won = true;
    }
  }

  return (
    <div className="bg-secondary flex flex-col space-y-2 rounded-xl p-3">
      <GameCardHeader game={game} />
      <div className="flex flex-row flex-wrap gap-1 md:gap-0">
        {/* Team containers */}
        {Object.entries(scoreMap).map(([team, scores]) => (
          <div
            key={team}
            data-team={Team[team as keyof typeof Team]}
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
        ))}
      </div>
    </div>
  );
}
