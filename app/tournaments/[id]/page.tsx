import { get } from '@/lib/actions/tournaments';
import {
  MatchDTO,
  TournamentDTO,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import type { Metadata } from 'next';
import { MatchRow, columns } from './columns';
import TournamentDataTable from './data-table';
import { Card } from '@/components/ui/card';
import {
  Users,
  Gamepad2,
  Calendar,
  Target,
  Swords,
  Zap,
  BarChart3,
  Award,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import { formatUTCDate } from '@/lib/utils/date';
import { formatRankRange } from '@/lib/utils/number';
import { RulesetEnumHelper } from '@/lib/enums';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { AdminNoteRouteTarget } from '@osu-tournament-rating/otr-api-client';
import AdminNoteView from '@/components/admin-notes/AdminNoteView';
import TournamentAdminView from '@/components/tournaments/TournamentAdminView';
import RulesetIcon from '@/components/icons/RulesetIcon';

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
      ? new Date(match.startTime).toISOString()
      : new Date().toISOString(),
    games: (match.games ?? []).map((game) => ({
      verificationStatus: game.verificationStatus,
      warningFlags: game.warningFlags,
      startTime: game.startTime,
      rejectionReason: game.rejectionReason,
    })),
  }));
}

function calculateDuration(
  startDate: Date | null,
  endDate: Date | null
): string {
  if (!startDate || !endDate) return 'Unknown';

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day';
  return `${diffDays} days`;
}

function formatRankRangeDisplay(rankRange: number): string {
  if (rankRange === 1) return 'Open';
  return formatRankRange(rankRange);
}

function TournamentHeader({ tournament }: { tournament: TournamentDTO }) {
  const startDate = tournament.startTime
    ? new Date(tournament.startTime)
    : null;
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null;

  return (
    <Card className="p-6 font-sans">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left side - Tournament info */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <VerificationBadge
              verificationStatus={tournament.verificationStatus}
              rejectionReason={tournament.rejectionReason}
              entityType="tournament"
              displayText={true}
            />
            <span className="font-mono text-sm text-muted-foreground">
              {tournament.abbreviation}
            </span>
          </div>

          <h1 className="text-2xl font-bold md:text-3xl">{tournament.name}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <RulesetIcon
                ruleset={tournament.ruleset}
                width={16}
                height={16}
                className="fill-current"
              />
              <span>
                {RulesetEnumHelper.getMetadata(tournament.ruleset).text}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {tournament.lobbySize}v{tournament.lobbySize}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>
                {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
              </span>
            </div>
            {startDate && endDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Admin actions */}
        <div className="flex gap-2">
          <AdminNoteView
            notes={tournament.adminNotes ?? []}
            entity={AdminNoteRouteTarget.Tournament}
            entityId={tournament.id}
            entityDisplayName={tournament.name}
          />
          <TournamentAdminView tournament={tournament} />
        </div>
      </div>
    </Card>
  );
}

function TournamentStatsCard({ tournament }: { tournament: TournamentDTO }) {
  const matches = tournament.matches ?? [];
  const totalGames = matches.reduce(
    (sum: number, match: MatchDTO) => sum + (match.games?.length ?? 0),
    0
  );
  const uniquePlayerIds = new Set(
    matches.flatMap(
      (match: MatchDTO) =>
        match.games?.flatMap((game) =>
          game.scores.map((score) => score.playerId)
        ) ?? []
    )
  );
  const totalPlayers = uniquePlayerIds.size;

  const startDate = tournament.startTime
    ? new Date(tournament.startTime)
    : null;
  const endDate = tournament.endTime ? new Date(tournament.endTime) : null;
  const duration = calculateDuration(startDate, endDate);

  // Calculate verification stats
  const verifiedMatches = matches.filter(
    (match) => match.verificationStatus === VerificationStatus.Verified
  ).length;
  const verificationRate =
    matches.length > 0
      ? ((verifiedMatches / matches.length) * 100).toFixed(1)
      : '0';

  // Calculate most active day
  const matchDates = matches
    .filter((match) => match.startTime)
    .map((match) => new Date(match.startTime!).toDateString());
  const dateCounts = matchDates.reduce(
    (acc, date) => {
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const peakMatches = Math.max(...Object.values(dateCounts), 0);

  return (
    <Card className="p-6 font-sans">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h3 className="font-sans text-lg font-semibold">
          Tournament Statistics
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Players"
          value={totalPlayers}
        />

        <StatCard
          icon={<Swords className="h-5 w-5" />}
          label="Matches"
          value={matches.length}
        />

        <StatCard
          icon={<Gamepad2 className="h-5 w-5" />}
          label="Games"
          value={totalGames}
        />

        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Duration"
          value={duration}
        />

        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Verified"
          value={`${verificationRate}%`}
        />

        <StatCard
          icon={<Zap className="h-5 w-5" />}
          label="Peak Day"
          value={`${peakMatches} matches`}
        />
      </div>
    </Card>
  );
}

export default async function Page({ params }: PageProps) {
  const tournament = await get({ id: (await params).id, verified: false });
  const tableData = generateTableData(tournament.matches ?? []);

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4 py-10 md:gap-2">
      <TournamentHeader tournament={tournament} />
      <TournamentStatsCard tournament={tournament} />

      <Card className="p-6 font-sans">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" />
          <h3 className="font-sans text-lg font-semibold">Matches</h3>
          <span className="text-sm text-muted-foreground">
            ({tableData.length})
          </span>
        </div>
        {/* @ts-expect-error Column def type doesnt work :/ */}
        <TournamentDataTable columns={columns} data={tableData} />
      </Card>
    </div>
  );
}
