import { getTournament } from '@/app/actions/tournaments';
import TournamentPageContent from '@/components/Tournaments/TournamentPageContent/TournamentPageContent';
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
        date={tournament.startTime}
      >
        <h1>{tournament.name}</h1>
      </TournamentPageHeader>
      <TournamentPageContent tournament={tournament} />
    </div>
  );
}
