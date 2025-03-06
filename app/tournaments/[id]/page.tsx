import TournamentCard from '@/components/tournaments/TournamentCard';
import { tournaments } from '@/lib/api';
import type { Metadata } from 'next';
import DataTable from './data-table';
import { MatchRow, columns } from './columns';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return {
    title: (await params).id.toString(),
  };
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
  const id = (await params).id;
  const { result: tournament } = await tournaments.get({
    id: id,
    verified: false,
  });
  const data = formatTableRows(tournament.matches ?? []);

  return (
    <>
      <TournamentCard tournament={tournament} displayStatusText={true} />
      <DataTable columns={columns} data={data} />
    </>
  );
}
