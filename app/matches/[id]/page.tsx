import { getMatch } from '@/app/actions/matches';
import MatchInfoContainer from '@/components/Matches/InfoContainer/MatchInfoContainer';
import TournamentPageHeader from '@/components/Tournaments/TournamentPageContent/TournamentPageHeader';

export default async function Page({
  params: { id },
}: {
  params: { id: number };
}) {
  const match = await getMatch({ id });

  return (
    <div className={'content'}>
      <TournamentPageHeader
        forumUrl={`https://osu.ppy.sh/mp/${match.osuId}`}
        startDate={match.startTime ?? ''}
        endDate={match.endTime ?? ''}
      >
        <h1>{match.name}</h1>
      </TournamentPageHeader>
      <MatchInfoContainer data={match} showTournament />
    </div>
  );
}
