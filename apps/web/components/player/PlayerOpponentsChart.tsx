'use client';

import PlayerFrequencyChart from './PlayerFrequencyChart';
import type { PlayerFrequency } from '@/lib/orpc/schema/playerStats';

interface PlayerOpponentsChartProps {
  className?: string;
  opponents: PlayerFrequency[];
  viewerMatchCount?: number;
  profileUsername?: string;
}

export default function PlayerOpponentsChart({
  className,
  opponents,
  viewerMatchCount,
  profileUsername,
}: PlayerOpponentsChartProps) {
  return (
    <PlayerFrequencyChart
      className={className}
      data={opponents}
      type="opponents"
      title="Frequent Opponents"
      description="Most frequently played against opponents"
      emptyMessage="No opponent data available"
      chartColor="var(--chart-2)"
      viewerMatchCount={viewerMatchCount}
      profileUsername={profileUsername}
    />
  );
}
