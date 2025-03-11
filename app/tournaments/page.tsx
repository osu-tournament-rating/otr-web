import TournamentCard from '@/components/tournaments/TournamentCard';
import { tournaments } from '@/lib/api';

export default async function Page() {
  const tournamentData = await tournaments.list({
    page: 1,
    pageSize: 25,
    verified: false,
  });

  return (
    <>
      {tournamentData.result.map((t) => (
        <div className="mt-2 flex-1" key={t.id}>
          <TournamentCard tournament={t} titleIsLink />
        </div>
      ))}
    </>
  );
}
