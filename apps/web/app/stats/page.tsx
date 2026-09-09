import { BarChart3 } from 'lucide-react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PlayersTab from '@/components/stats/PlayersTab';
import StatsTabs from '@/components/stats/StatsTabs';
import TournamentsTab from '@/components/stats/TournamentsTab';
import { orpc } from '@/lib/orpc/orpc';
import { parseStatsRuleset, parseStatsTab } from '@/lib/stats/params';

export const metadata: Metadata = {
  title: 'Platform Statistics | o!TR',
  description: 'View platform-wide statistics and insights for o!TR',
};

export default async function StatsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const tab = parseStatsTab(searchParams.tab);
  const ruleset = parseStatsRuleset(searchParams.ruleset);

  let stats: Awaited<ReturnType<typeof orpc.stats.platform>>;

  try {
    stats = await orpc.stats.platform();
  } catch (error) {
    console.error('Failed to fetch platform stats:', error);
    return notFound();
  }

  if (!stats) {
    return notFound();
  }

  const playerStats =
    tab === 'players' ? await orpc.stats.players({ ruleset }) : null;

  return (
    <div className="container mx-auto flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 data-testid="stats-page-heading" className="text-3xl font-bold">
            Platform Statistics
          </h1>
        </div>
        <p
          data-testid="stats-page-description"
          className="text-muted-foreground"
        >
          Statistics covering all of osu! tournaments
        </p>
      </div>

      <StatsTabs tab={tab} ruleset={ruleset} />

      {tab === 'players' ? (
        <PlayersTab
          ruleset={ruleset}
          ratings={stats.ratingStats.ratingsByRuleset[`${ruleset}`] ?? {}}
          stats={playerStats?.stats ?? null}
        />
      ) : (
        <TournamentsTab tournamentStats={stats.tournamentStats} />
      )}
    </div>
  );
}
