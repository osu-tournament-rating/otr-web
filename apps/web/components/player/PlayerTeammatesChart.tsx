'use client';

import type { Ruleset } from '@otr/core/osu';
import { Users } from 'lucide-react';

import { seriesColor } from '@/lib/kit/color/categorical';
import type { PlayerFrequency } from '@/lib/orpc/schema/playerStats';

import PlayerFrequencyChart from './PlayerFrequencyChart';

export default function PlayerTeammatesChart({
  className,
  teammates,
  ruleset,
}: {
  className?: string;
  teammates: PlayerFrequency[];
  /** The ruleset the profile shows; the chart's links open it too. */
  ruleset: Ruleset;
}) {
  return (
    <PlayerFrequencyChart
      className={className}
      data={teammates}
      title="Frequent teammates"
      icon={Users}
      emptyTitle="No teammate data"
      ruleset={ruleset}
      color={seriesColor(0)}
    />
  );
}
