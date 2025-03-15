import { leaderboards } from '@/lib/api';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import { LeaderboardDataTable } from './data-table';
import { columns } from './columns';

async function getData() {
  return await leaderboards.get({
    ruleset: Ruleset.Osu,
  });
}

export default async function Page() {
  const data = await getData();

  return (
    <div className="container mx-auto py-10">
      <LeaderboardDataTable columns={columns} data={data.result.leaderboard} />
    </div>
  );
}
