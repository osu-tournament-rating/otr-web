import TournamentCard from '@/components/tournaments/TournamentCard';
import { get } from '@/lib/actions/tournaments';
import { MatchDTO } from '@osu-tournament-rating/otr-api-client';
import type { Metadata } from 'next';
import { MatchRow, columns } from './columns';
import TournamentDataTable from './data-table';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const tournament = await get({ id: (await params).id, verified: false });

  return { title: tournament.name };
}

function generateTableData(matches: MatchDTO[]): MatchRow[] {
  return matches.map((match) => ({
    id: match.id,
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
  const tableData = generateTableData(tournament.matches ?? []);

  return (
    <div className="mb-5 mt-5 flex flex-col gap-y-5">
      <TournamentCard
        tournament={tournament}
        displayStatusText
        allowAdminView
      />
      {/* @ts-expect-error Column def type doesnt work :/ */}
      <TournamentDataTable columns={columns} data={tableData} />
    </div>
  );
}
