import GameCard from '@/components/games/GameCard';
import MatchCard from '@/components/matches/MatchCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { get, getStats } from '@/lib/actions/matches';
import { Metadata } from 'next';
import MatchStatsView from '@/components/matches/MatchStatsView';
import { Gamepad2, BarChart3 } from 'lucide-react';
import { VerificationStatus } from '@osu-tournament-rating/otr-api-client';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const match = await get({ id: (await params).id });

  return { title: match.name };
}

export default async function Page({ params }: PageProps) {
  const matchId = (await params).id;
  const match = await get({ id: matchId });
  const stats = await getStats(matchId);

  const isVerified = match.verificationStatus === VerificationStatus.Verified;
  const gameCount = match.games?.length ?? 0;

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <MatchCard match={match} />

      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="mt-4">
          <Card className="p-6 font-sans">
            <div className="mb-4 flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h3 className="font-sans text-lg font-semibold">Games</h3>
              <span className="text-sm text-muted-foreground">
                ({gameCount})
              </span>
            </div>
            {gameCount > 0 ? (
              <div className="space-y-4">
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
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No games recorded for this match
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {isVerified ? (
            stats ? (
              <MatchStatsView stats={stats} match={match} />
            ) : (
              <Card className="p-6 font-sans">
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No statistics available for this match
                </div>
              </Card>
            )
          ) : (
            <Card className="p-6 font-sans">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-lg font-semibold text-muted-foreground">
                    Statistics Not Available
                  </p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Match statistics are only available for verified matches.
                    This match is currently
                    {match.verificationStatus ===
                      VerificationStatus.PreVerified &&
                      ' awaiting verification'}
                    {match.verificationStatus === VerificationStatus.Rejected &&
                      ' rejected'}
                    {match.verificationStatus ===
                      VerificationStatus.PreRejected && ' flagged for review'}
                    {match.verificationStatus === VerificationStatus.None &&
                      ' pending processing'}
                    .
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
