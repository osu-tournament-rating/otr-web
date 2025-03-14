import TournamentCard from '@/components/tournaments/TournamentCard';
import { tournaments } from '@/lib/api';
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';

export default async function Page() {
  const tournamentData = await tournaments.list({
    page: 3,
    pageSize: 75,
    verified: false,
    sort: TournamentQuerySortType.EndTime,
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
