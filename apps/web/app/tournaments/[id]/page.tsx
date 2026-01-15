import { getTournamentCached } from '@/lib/orpc/queries/tournament';
import { VerificationStatus } from '@otr/core/osu';
import {
  TournamentDetail,
  TournamentMatch,
} from '@/lib/orpc/schema/tournament';
import type { Metadata } from 'next';
import { z } from 'zod';
import { MatchRow } from './columns';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Gamepad2,
  Calendar,
  Swords,
  Zap,
  BarChart3,
  Award,
  Music,
} from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import TournamentCard from '@/components/tournaments/TournamentCard';
import TournamentBeatmapsAdminView from '@/components/tournaments/TournamentBeatmapsAdminView';
import TournamentMatchesAdminView from '@/components/tournaments/TournamentMatchesAdminView';
import TournamentPlayerStatsView from '@/components/tournaments/TournamentPlayerStatsView';
import Link from 'next/link';
import TournamentRatingsView from '@/components/tournaments/TournamentRatingsView';
import {
  fetchOrpcOptional,
  fetchOrpcOrNotFound,
  parseParamsOrNotFound,
} from '@/lib/orpc/server-helpers';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TOURNAMENT_TABS = ['matches', 'beatmaps', 'ratings', 'stats'] as const;
type TournamentTab = (typeof TOURNAMENT_TABS)[number];
const DEFAULT_TAB: TournamentTab = 'matches';

const tournamentPageParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const parsedParams = tournamentPageParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    return { title: 'Tournament Not Found' };
  }

  const tournament = await fetchOrpcOptional(() =>
    getTournamentCached(parsedParams.data.id)
  );

  if (!tournament) {
    return { title: 'Tournament Not Found' };
  }

  return { title: tournament.name };
}

function generateTableData(matches: TournamentMatch[]): MatchRow[] {
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
      verifiedByUsername: match.verifiedByUsername,
    },
    startDate: match.startTime
      ? new Date(match.startTime).toISOString()
      : new Date().toISOString(),
    games: (match.games ?? []).map((game) => ({
      id: game.id,
      verificationStatus: game.verificationStatus,
      warningFlags: game.warningFlags,
      startTime: game.startTime,
      rejectionReason: game.rejectionReason,
      adminNotes: (game.adminNotes ?? []).map((note) => ({
        note: note.note,
        adminUsername: note.adminUser?.player?.username ?? 'Unknown',
        created: note.created,
      })),
    })),
    matchAdminNotes: (match.adminNotes ?? []).map((note) => ({
      note: note.note,
      adminUsername: note.adminUser?.player?.username ?? 'Unknown',
      created: note.created,
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

function TournamentStatsCard({ tournament }: { tournament: TournamentDetail }) {
  const matches = tournament.matches ?? [];
  const totalGames = matches.reduce(
    (sum: number, match: TournamentMatch) => sum + (match.games?.length ?? 0),
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
      <div className="flex items-center gap-2">
        <BarChart3 className="text-primary h-6 w-6" />
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

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = parseParamsOrNotFound(
    tournamentPageParamsSchema,
    await params
  );
  const { tab: tabParam } = await searchParams;
  const currentTab: TournamentTab = TOURNAMENT_TABS.includes(
    tabParam as TournamentTab
  )
    ? (tabParam as TournamentTab)
    : DEFAULT_TAB;
  const createTabHref = (tab: TournamentTab) => `/tournaments/${id}?tab=${tab}`;

  const tournament: TournamentDetail = await fetchOrpcOrNotFound(() =>
    getTournamentCached(id)
  );
  const tableData = generateTableData(tournament.matches ?? []);
  const beatmaps = tournament.pooledBeatmaps ?? [];

  // Extract all games from all matches for beatmap analysis
  const tournamentGames =
    tournament.matches?.flatMap((match) => match.games ?? []) ?? [];

  // Calculate hidden beatmaps count
  const hiddenBeatmapsCount = beatmaps.filter((beatmap) => {
    const artist = beatmap.beatmapset?.artist || 'Unknown Artist';
    const title = beatmap.beatmapset?.title || 'Unknown Title';
    return artist === 'Unknown Artist' && title === 'Unknown Title';
  }).length;

  const visibleBeatmapsCount = beatmaps.length - hiddenBeatmapsCount;

  return (
    <div className="container mx-auto flex flex-col gap-4 md:gap-2">
      <TournamentCard tournament={tournament} variant="detail" />

      <Tabs value={currentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matches" asChild>
            <Link href={createTabHref('matches')}>Matches</Link>
          </TabsTrigger>
          <TabsTrigger value="beatmaps" asChild>
            <Link href={createTabHref('beatmaps')}>Beatmaps</Link>
          </TabsTrigger>
          <TabsTrigger value="ratings" asChild>
            <Link href={createTabHref('ratings')}>Ratings</Link>
          </TabsTrigger>
          <TabsTrigger value="stats" asChild>
            <Link href={createTabHref('stats')}>Stats</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="mt-4">
          <Card className="p-6 font-sans">
            <div className="flex items-center gap-2">
              <Swords className="text-primary h-6 w-6" />
              <h3 className="font-sans text-lg font-semibold">Matches</h3>
              <span className="text-muted-foreground text-sm">
                ({tableData.length})
              </span>
            </div>
            <TournamentMatchesAdminView
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              matches={tableData}
              isLazer={tournament.isLazer}
            />
          </Card>
        </TabsContent>

        <TabsContent value="beatmaps" className="mt-4">
          <Card className="p-6 font-sans">
            <div className="flex items-center gap-2">
              <Music className="text-primary h-6 w-6" />
              <h3 className="font-sans text-lg font-semibold">
                Pooled Beatmaps
              </h3>
              <span className="text-muted-foreground text-sm">
                ({visibleBeatmapsCount}
                {hiddenBeatmapsCount > 0 && `, ${hiddenBeatmapsCount} deleted`})
              </span>
            </div>
            <TournamentBeatmapsAdminView
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              beatmaps={beatmaps}
              tournamentGames={tournamentGames}
            />
          </Card>
        </TabsContent>

        <TabsContent value="ratings" className="mt-4">
          <Card className="p-6 font-sans">
            <TournamentRatingsView
              playerStats={tournament.playerTournamentStats ?? []}
            />
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4 space-y-4">
          <TournamentStatsCard tournament={tournament} />
          <TournamentPlayerStatsView
            playerStats={tournament.playerTournamentStats ?? []}
            ruleset={tournament.ruleset}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
