import TournamentCard from '@/components/tournaments/TournamentCard';
import { tournaments } from '@/lib/api';
import { Metadata } from 'next';

export default async function Page() {
  const tournamentData = await tournaments.list({
    page: 1,
    pageSize: 25,
    verified: false,
  });

  return (
    <>
      {tournamentData.result.map((t) => (
        <div className="flex-1 mt-2" key={t.id}>
          <TournamentCard tournament={t} displayStatusText={false} />
        </div>
      ))}
    </>
  );
}
