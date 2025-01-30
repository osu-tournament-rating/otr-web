import { getTournament } from '@/app/actions/tournaments';
import MatchesList from '@/components/Matches/List/MatchesList';
import TournamentInfoContainer from '@/components/Tournaments/InfoContainer/TournamentInfoContainer';
import TournamentPageHeader from '@/components/Tournaments/PageContent/TournamentPageHeader';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const tournament = await getTournament({ id: (await params).id, verified: false });

  return { title: tournament.name };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: number }>;
}) {
  const tournament = await getTournament({ id: (await params).id, verified: false });

  return (
    <div className={'content'}>
      <TournamentPageHeader data={tournament} />
      <TournamentInfoContainer data={tournament} showName={false} />
      <h1>Matches</h1>
      <MatchesList data={tournament.matches ?? []} />
    </div>
  );
}
