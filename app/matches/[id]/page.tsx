import { getMatch } from '@/app/actions/matches';
import GamesList from '@/components/Games/List/GamesList';
import MatchPageHeader from '@/components/Matches/PageContent/MatchPageHeader';

export default async function Page({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const match = await getMatch({ id: (await params).id, verified: false });

  return (
    <div className={'content'}>
      <MatchPageHeader data={match} />
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
