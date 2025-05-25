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
  // Sort matches by start time descending
  const sortedMatches = [...matches].sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
    return timeB - timeA;
  });

  return sortedMatches.map((match) => ({
    id: match.id,
    name: match.name,
    status: {
      verificationStatus: match.verificationStatus,
      warningFlags: match.warningFlags,
      rejectionReason: match.rejectionReason,
    },
    startDate: match.startTime
      ? new Date(match.startTime).toLocaleDateString()
      : new Date().toLocaleDateString(),
    games: (match.games ?? []).map((game) => ({
      verificationStatus: game.verificationStatus,
      warningFlags: game.warningFlags,
      startTime: game.startTime,
      rejectionReason: game.rejectionReason,
    })),
  }));
}

export default async function Page({ params }: PageProps) {
  const tournament = await get({ id: (await params).id, verified: false });
  const tableData = generateTableData(tournament.matches ?? []);

  return (
    <div className="mt-5 mb-5 flex flex-col gap-y-5">
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
