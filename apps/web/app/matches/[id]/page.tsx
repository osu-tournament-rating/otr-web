import { Metadata } from 'next';
import { z } from 'zod';
import { Gamepad2, BarChart3 } from 'lucide-react';

import GameCard from '@/components/games/GameCard';
import MatchCard from '@/components/matches/MatchCard';
import MatchStatsView from '@/components/matches/MatchStatsView';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { orpc } from '@/lib/orpc/orpc';
import { MatchDetail } from '@/lib/orpc/schema/match';
import { VerificationStatus } from '@otr/core/osu';
import {
  fetchOrpcOptional,
  fetchOrpcOrNotFound,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';

type PageProps = { params: Promise<{ id: number }> };

const matchPageParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsedParams = matchPageParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return { title: 'Match Not Found' };
  }

  const match = await fetchOrpcOptional(() =>
    orpc.matches.get({ id: parsedParams.data.id })
  );

  if (!match) {
    return { title: 'Match Not Found' };
  }

  return { title: match.name };
}

export default async function Page({ params }: PageProps) {
  const { id } = parseParamsOrNotFound(matchPageParamsSchema, await params);
  const match: MatchDetail = await fetchOrpcOrNotFound(() =>
    orpc.matches.get({ id })
  );

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
            <div className="flex items-center gap-2">
              <Gamepad2 className="text-primary h-6 w-6" />
              <h3 className="font-sans text-lg font-semibold">Games</h3>
              <span className="text-muted-foreground text-sm">
                ({gameCount})
              </span>
            </div>
            {gameCount > 0 ? (
              <div className="space-y-4">
                {[...(match.games ?? [])]
                  .sort((a, b) => {
                    const aTime = a.startTime
                      ? new Date(a.startTime).getTime()
                      : 0;
                    const bTime = b.startTime
                      ? new Date(b.startTime).getTime()
                      : 0;
                    return aTime - bTime;
                  })
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
              <div className="text-muted-foreground flex h-32 items-center justify-center">
                No games recorded for this match
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {isVerified ? (
            <MatchStatsView match={match} />
          ) : (
            <Card className="p-6 font-sans">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <BarChart3 className="text-muted-foreground/50 h-12 w-12" />
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-muted-foreground text-lg font-semibold">
                    Statistics Not Available
                  </p>
                  <p className="text-muted-foreground max-w-md text-sm">
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
