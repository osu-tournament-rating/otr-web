'use client';

import { PlayerFrequencyDTO } from '@osu-tournament-rating/otr-api-client';
import PlayerFrequencyChart from './PlayerFrequencyChart';

interface PlayerOpponentsChartProps {
  className?: string;
  opponents: PlayerFrequencyDTO[];
}

export default function PlayerOpponentsChart({
  className,
  opponents,
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
    />
  );
}
