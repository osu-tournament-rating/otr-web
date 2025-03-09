import TournamentCard from '@/components/tournaments/TournamentCard';
import type { Metadata } from 'next';
import DataTable from './data-table';
import { MatchRow, columns } from './columns';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import { get } from '@/lib/actions/tournaments';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const tournament = await get({ id: (await params).id, verified: false });

  tournament.matches?.sort(
    (a, b) =>
      new Date(a?.startTime ?? 0).getUTCMilliseconds() -
      new Date(b?.startTime ?? 0).getUTCMilliseconds()
  );
  return { title: tournament.name };
}

function formatTableRows(matches: MatchDTO[]): MatchRow[] {
  return matches.map((match) => ({
    name: match.name,
    status: {
      verificationStatus: match.verificationStatus,
      warningFlags: match.warningFlags,
    },
    startDate: match.startTime
      ? new Date(match.startTime).toLocaleDateString()
      : new Date().toLocaleDateString(),
  }));
}

export default async function Page({ params }: PageProps) {
  const tournament = await get({ id: (await params).id, verified: false });
  const data = formatTableRows(tournament.matches ?? []);

  return (
    <>
      <div className="flex flex-col gap-y-5 mt-5 mb-5">
        <TournamentCard
          tournament={tournament}
          displayStatusText
          displayEditIcon
        />
        <DataTable columns={columns} data={data} />
      </div>
    </>
  );
}
