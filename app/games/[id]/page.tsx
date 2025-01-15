import GameInfoContainer from '@/components/Games/InfoContainer/GameInfoContainer';
import ScoresList from '@/components/Scores/List/ScoresList';
import { getGame } from '@/app/actions/games';

export default async function Page({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const game = await getGame({ id: (await params).id, verified: false });

  return (
    <div className={'content'}>
      <h1>{game.beatmap.title} [{game.beatmap.diffName}]</h1>
      <GameInfoContainer data={game} />
      <ScoresList data={game.scores} players={game.players} />
    </div>
  );
}
