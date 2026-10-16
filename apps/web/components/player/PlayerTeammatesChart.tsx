'use client';

import { Users } from 'lucide-react';

import { seriesColor } from '@/lib/kit/color/categorical';
import type { PlayerFrequency } from '@/lib/orpc/schema/playerStats';

import PlayerFrequencyChart from './PlayerFrequencyChart';
import { TEAMMATES_INFO } from './section-info';

export default function PlayerTeammatesChart({
  className,
  teammates,
}: {
  className?: string;
  teammates: PlayerFrequency[];
}) {
  return (
    <PlayerFrequencyChart
      className={className}
      data={teammates}
      title="Frequent teammates"
      icon={Users}
      infoText={TEAMMATES_INFO}
      emptyTitle="No teammate data available"
      color={seriesColor(0)}
    />
  );
}
