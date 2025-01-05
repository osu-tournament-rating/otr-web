import { getTournament } from '@/app/actions/tournaments';
import MatchesList from '@/components/Matches/List/MatchesList';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import TournamentPageHeader from '@/components/Tournaments/TournamentPageContent/TournamentPageHeader';

export const revalidate = 60;

export async function generateMetadata({
  params: { id },
}: {
  params: { id: number };
}) {
  const tournament = await getTournament({ id, verified: true });

  return { title: tournament.name };
}

export default async function Page({
  params: { id },
}: {
  params: { id: number };
}) {
  const tournament = await getTournament({ id, verified: false });

  return (
    <div className={'content'}>
      <TournamentPageHeader
        forumUrl={tournament.forumUrl}
        startDate={tournament.startTime}
        endDate={tournament.startTime}
      >
        <h1>{tournament.name}</h1>
      </TournamentPageHeader>
      <TournamentInfoContainer data={tournament} showName={false} />
      <MatchesList data={tournament.matches ?? []} />
    </div>
  );
}
