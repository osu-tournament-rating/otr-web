'use client';

import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import type { PlayerStats } from '@otr/core/stats/player-stats';
import { CHART_COLORS, formatChartNumber } from '@/lib/utils/chart';

const CHART_HEIGHT = 220;

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="font-bold">
        Players: {formatChartNumber(payload[0].value ?? 0)}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Unique players with a verified match in each month, all time. */
export default function PlayerParticipationChart({
  participation,
}: {
  participation: PlayerStats['participation'];
}) {
  const { data, yearTicks } = useMemo(() => {
    const sorted = [...participation].sort((a, b) =>
      a.month.localeCompare(b.month)
    );
    const seen = new Set<string>();
    const ticks: string[] = [];

    for (const entry of sorted) {
      const year = entry.month.slice(0, 4);
      if (!seen.has(year)) {
        seen.add(year);
        ticks.push(entry.month);
      }
    }

    return { data: sorted, yearTicks: ticks };
  }, [participation]);

  return (
    <SectionCard
      className="flex flex-col"
      data-testid="chart-player-participation"
    >
      <SectionHeader
        icon={TrendingUp}
        title="Player participation"
        infoText="Unique players with a verified match in each month. Months start on the UTC first."
        meta="Players per month · all time"
      />

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="px-4 py-4">
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={CHART_COLORS.mutedForeground}
              />
              <XAxis
                dataKey="month"
                ticks={yearTicks}
                tickFormatter={(month: string) => month.slice(0, 4)}
                tickLine={false}
                stroke={CHART_COLORS.mutedForeground}
                className="text-xs"
              />
              <YAxis
                tickFormatter={formatChartNumber}
                tickLine={false}
                axisLine={false}
                width={52}
                stroke={CHART_COLORS.mutedForeground}
                className="text-xs"
              />
              <Tooltip
                cursor={{ fill: CHART_COLORS.accent }}
                content={<CustomTooltip />}
              />
              <Bar dataKey="players" fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}
