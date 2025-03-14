import {
  GameDTO,
  PlayerCompactDTO,
  Team,
} from '@osu-tournament-rating/otr-api-client';
import GameCardHeader from './GameCardHeader';
import ScoreCard from './ScoreCard';

export default function GameCard({
  game,
  players = [],
}: {
  game: GameDTO;
  players: PlayerCompactDTO[];
}) {
  // Score card placement logic
  let nNoTeam = 0,
    nRed = 0,
    nBlue = 0;

  return (
    <div className="flex flex-col space-y-2 rounded-xl bg-secondary p-2">
      <GameCardHeader game={game} />
      {/* Scores */}
      <div className="grid auto-rows-[5rem] grid-cols-2 gap-2">
        {game.scores
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
              <ScoreCard
                key={score.id}
                row={row}
                score={score}
                player={players.find((p) => p.id === score.playerId)}
              />
            );
          })}
      </div>
    </div>
  );
}
