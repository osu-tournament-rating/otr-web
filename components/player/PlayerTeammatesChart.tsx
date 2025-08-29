'use client';

import { PlayerFrequencyDTO } from '@osu-tournament-rating/otr-api-client';
import PlayerFrequencyChart from './PlayerFrequencyChart';

interface PlayerTeammatesChartProps {
  className?: string;
  teammates: PlayerFrequencyDTO[];
}

export default function PlayerTeammatesChart({
  className,
  teammates,
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
    />
  );
}
