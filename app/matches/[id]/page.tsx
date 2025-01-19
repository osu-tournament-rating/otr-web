import { getMatch } from '@/app/actions/matches';
import GamesList from '@/components/Games/List/GamesList';
import TournamentPageHeader from '@/components/Tournaments/TournamentPageContent/TournamentPageHeader';

export default async function Page({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const match = await getMatch({ id: (await params).id, verified: false });

  return (
    <div className={'content'}>
      <TournamentPageHeader
        forumUrl={`https://osu.ppy.sh/mp/${match.osuId}`}
        startDate={match.startTime ?? ''}
        endDate={match.endTime ?? ''}
      >
        <h1>{match.name}</h1>
      </TournamentPageHeader>
      <GamesList
        data={match.games.toSorted(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )}
        players={match.players}
      />
    </div>
  );
}
