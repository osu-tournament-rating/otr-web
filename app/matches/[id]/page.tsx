import GameCard from '@/components/matches/GameCard';
import { get } from '@/lib/actions/matches';
import { Metadata } from 'next';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const match = await get({ id: (await params).id, verified: false });

  return { title: match.name };
}

export default async function Page({ params }: PageProps) {
  const match = await get({ id: (await params).id, verified: false });

  return (
    <div className="space-y-2">
      <h1>{match.name}</h1>
      {(match.games ?? []).map((game) => (
        <GameCard
          key={game.id}
          game={game}
          players={(match.players ?? []).filter((player) =>
            game.scores.map((s) => s.playerId).includes(player.id)
          )}
        />
      ))}
    </div>
  );
}
