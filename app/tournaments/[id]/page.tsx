import { get, getBeatmaps } from '@/lib/actions/tournaments';
import {
  MatchCompactDTO,
  TournamentDTO,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import type { Metadata } from 'next';
import { MatchRow, columns } from './columns';
import TournamentDataTable from './data-table';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Gamepad2,
  Calendar,
  Target,
  Swords,
  Zap,
  BarChart3,
  Award,
  Music,
  ExternalLink,
  // TrendingUp,
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
import TournamentBeatmapsView from '@/components/tournaments/TournamentBeatmapsView';
import TournamentPlayerStatsDashboard from '@/components/tournaments/TournamentPlayerStatsDashboard';
import { Button } from '@/components/ui/button';
import SimpleTooltip from '@/components/simple-tooltip';
import Link from 'next/link';
// import TournamentRatingsView from '@/components/tournaments/TournamentRatingsView';

type PageProps = { params: Promise<{ id: number }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const tournament = await get({ id: (await params).id });

  return { title: tournament.name };
}

function generateTableData(matches: MatchCompactDTO[]): MatchRow[] {
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
    <Card className="p-4 font-sans sm:p-6">
      <div className="flex flex-col gap-4">
        {/* Top row - verification badge, abbreviation, and admin actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Verification badge - will be on its own line on mobile */}
          <VerificationBadge
            verificationStatus={tournament.verificationStatus}
            rejectionReason={tournament.rejectionReason}
            entityType="tournament"
            displayText={true}
          />

          {/* Abbreviation and admin actions */}
          <div className="flex w-full items-center justify-between sm:w-auto sm:justify-start sm:gap-3">
            <span className="font-mono text-sm text-muted-foreground">
              {tournament.abbreviation}
            </span>
            <div className="flex gap-2">
              {' '}
              {/* Admin actions */}
              <AdminNoteView
                notes={tournament.adminNotes ?? []}
                entity={AdminNoteRouteTarget.Tournament}
                entityId={tournament.id}
                entityDisplayName={tournament.name}
              />
              <TournamentAdminView tournament={tournament} />
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center gap-2">
          {/* Tournament name */}
          <h1 className="text-xl leading-tight font-bold sm:text-2xl md:text-3xl">
            {tournament.name}
          </h1>
          <SimpleTooltip content="View tournament on osu! website">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/20 hover:text-white"
            >
              <Link
                href={tournament.forumUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View tournament on osu! website"
              >
                <ExternalLink className="h-3 w-3 text-white/70 hover:text-white" />
              </Link>
            </Button>
          </SimpleTooltip>
        </div>

        {/* Tournament metadata */}
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex items-center gap-1.5">
            <RulesetIcon
              ruleset={tournament.ruleset}
              width={16}
              height={16}
              className="flex-shrink-0 fill-current"
            />
            <span className="truncate">
              {RulesetEnumHelper.getMetadata(tournament.ruleset).text}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {tournament.lobbySize}v{tournament.lobbySize}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Target className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {formatRankRangeDisplay(tournament.rankRangeLowerBound)}
            </span>
          </div>

          {startDate && endDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">
                {formatUTCDate(startDate)} - {formatUTCDate(endDate)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function TournamentStatsCard({ tournament }: { tournament: TournamentDTO }) {
  const matches = tournament.matches ?? [];
  const totalGames = matches.reduce(
    (sum: number, match: MatchCompactDTO) => sum + (match.games?.length ?? 0),
    0
  );
  // Use tournament player stats to get the total number of players
  const totalPlayers = tournament.playerTournamentStats?.length ?? 0;

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
  const tournament = await get({ id: (await params).id });
  const tableData = generateTableData(tournament.matches ?? []);
  const beatmaps = (await getBeatmaps((await params).id)) ?? [];

  // Note: GameCompactDTO doesn't include beatmap and mods properties needed for mod calculation
  // This functionality would require fetching full game data
  const tournamentGames: never[] = [];

  // Calculate hidden beatmaps count
  const hiddenBeatmapsCount = beatmaps.filter((beatmap) => {
    const artist = beatmap.beatmapset?.artist || 'Unknown Artist';
    const title = beatmap.beatmapset?.title || 'Unknown Title';
    return artist === 'Unknown Artist' && title === 'Unknown Title';
  }).length;

  const visibleBeatmapsCount = beatmaps.length - hiddenBeatmapsCount;

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <TournamentHeader tournament={tournament} />

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="beatmaps">Beatmaps</TabsTrigger>
          {/* <TabsTrigger value="ratings">Ratings</TabsTrigger> */}
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-4">
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
        </TabsContent>

        <TabsContent value="beatmaps" className="mt-4">
          <Card className="p-6 font-sans">
            <div className="mb-4 flex items-center gap-2">
              <Music className="h-6 w-6 text-primary" />
              <h3 className="font-sans text-lg font-semibold">
                Pooled Beatmaps
              </h3>
              <span className="text-sm text-muted-foreground">
                ({visibleBeatmapsCount}
                {hiddenBeatmapsCount > 0 && `, ${hiddenBeatmapsCount} deleted`})
              </span>
            </div>
            <TournamentBeatmapsView
              beatmaps={beatmaps}
              tournamentGames={tournamentGames}
            />
          </Card>
        </TabsContent>

        {/* TODO: Add ratings tab */}
        {/* <TabsContent value="ratings" className="mt-4">
          <Card className="p-6 font-sans">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h3 className="font-sans text-lg font-semibold">
                Rating Changes
              </h3>
              <span className="text-sm text-muted-foreground">
                ({tournament.playerTournamentStats?.length || 0})
              </span>
            </div>
            <TournamentRatingsView
              playerStats={tournament.playerTournamentStats ?? []}
            />
          </Card>
        </TabsContent> */}

        <TabsContent value="stats" className="mt-4 space-y-4">
          <TournamentStatsCard tournament={tournament} />
          <TournamentPlayerStatsDashboard
            playerStats={tournament.playerTournamentStats ?? []}
            ruleset={tournament.ruleset}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
