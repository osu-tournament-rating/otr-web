'use client';

import PlayerFrequencyChart from './PlayerFrequencyChart';
import type { PlayerFrequency } from '@/lib/orpc/schema/playerStats';

interface PlayerTeammatesChartProps {
  className?: string;
  teammates: PlayerFrequency[];
  viewerMatchCount?: number;
  profileUsername?: string;
}

export default function PlayerTeammatesChart({
  className,
  teammates,
  viewerMatchCount,
  profileUsername,
}: PlayerTeammatesChartProps) {
  return (
    <PlayerFrequencyChart
      className={className}
      data={teammates}
      type="teammates"
      title="Frequent Teammates"
      description="Most frequently played with teammates"
      emptyMessage="No teammate data available"
      chartColor="var(--primary)"
      viewerMatchCount={viewerMatchCount}
      profileUsername={profileUsername}
    />
  );
}
