import TournamentCard from '@/components/tournaments/TournamentCard';
import type { Metadata } from 'next';
import DataTable from './data-table';
import { MatchRow, columns } from './columns';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import { get } from '@/lib/actions/tournaments'

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const tournament = await get({ id: (await params).id, verified: false });

  return { title: tournament.name };
}

function formatTableRows(matches: MatchDTO[]): MatchRow[] {
  return matches.map((match) => ({
    name: match.name,
    verificationStatus: match.verificationStatus,
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
      <TournamentCard
        tournament={tournament}
        displayStatusText
        displayEditIcon
      />
      <DataTable columns={columns} data={data} />
    </>
  );
}
