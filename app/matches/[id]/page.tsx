import GameCard from '@/components/games/GameCard';
import MatchCard from '@/components/matches/MatchCard';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
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
    <div className="mt-2">
      <MatchCard match={match} />
      <Tabs defaultValue="games" className="rounded-2xl bg-card">
        <TabsList>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="else">Something Else</TabsTrigger>
        </TabsList>
        <TabsContent value="games">
          <div className="space-y-4 px-4 md:px-12 xl:px-24">
            {(match.games ?? [])
              .sort(
                (a, b) =>
                  new Date(a.startTime).getTime() -
                  new Date(b.startTime).getTime()
              )
              .map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  players={(match.players ?? []).filter((player) =>
                    game.scores.map((s) => s.playerId).includes(player.id)
                  )}
                />
              ))}
          </div>
        </TabsContent>
        <TabsContent value="other">
          <h1>SOMETHING ELSE</h1>
        </TabsContent>
      </Tabs>
    </div>
  );
}
