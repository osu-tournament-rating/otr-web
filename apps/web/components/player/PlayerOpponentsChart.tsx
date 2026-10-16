'use client';

import { Swords } from 'lucide-react';

import { seriesColor } from '@/lib/kit/color/categorical';
import type { PlayerFrequency } from '@/lib/orpc/schema/playerStats';

import PlayerFrequencyChart from './PlayerFrequencyChart';

export default function PlayerOpponentsChart({
  className,
  opponents,
}: {
  className?: string;
  opponents: PlayerFrequency[];
}) {
  return (
    <PlayerFrequencyChart
      className={className}
      data={opponents}
      title="Frequent opponents"
      icon={Swords}
      infoText="Most frequently played against opponents"
      emptyTitle="No opponent data available"
      color={seriesColor(1)}
    />
  );
}
