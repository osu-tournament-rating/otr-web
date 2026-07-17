import { Gamepad2, Library, Trophy, UsersRound } from 'lucide-react';

import type { BeatmapStatsSummary } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapStatsCardProps {
  summary: BeatmapStatsSummary;
}

export default function BeatmapStatsCard({ summary }: BeatmapStatsCardProps) {
  const stats = [
    {
      label: 'Games',
      value: summary.totalGameCount,
      icon: Gamepad2,
    },
    {
      label: 'Tournaments played',
      value: summary.verifiedPlayedTournamentCount,
      icon: Trophy,
    },
    {
      label: 'Players',
      value: summary.totalPlayerCount,
      icon: UsersRound,
    },
    {
      label: 'Pool records',
      value: summary.totalTournamentCount,
      icon: Library,
    },
  ];

  return (
    <dl
      data-testid="beatmap-stats-card"
      className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-lg border bg-muted/20 sm:grid-cols-4 sm:divide-y-0 dark:bg-muted/45"
    >
      {stats.map(({ label, value, icon: Icon }) => (
        <div key={label} className="min-w-0 p-3 sm:p-4">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            {value.toLocaleString()}
          </dd>
        </div>
      ))}
    </dl>
  );
}
