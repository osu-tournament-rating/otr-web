'use client';

import { useMemo } from 'react';
import { ChartPie } from 'lucide-react';
import { Label, Pie, PieChart } from 'recharts';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
  Swatch,
} from '@/components/beatmap/BeatmapSection';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { VerificationStatus } from '@otr/core/osu';
import { VerificationStatusKey } from '@/lib/orpc/schema/stats';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';

interface TournamentVerificationChartProps {
  verificationCounts: Partial<Record<VerificationStatusKey, number>>;
}

interface ChartDataEntry {
  status: string;
  count: number;
  fill: string;
  percentage: number;
}

const STATUS_CONFIG = {
  Verified: { color: 'var(--color-status-verified)' },
  Rejected: { color: 'var(--color-status-rejected)' },
  'Awaiting review': { color: 'var(--color-status-awaiting)' },
  Pending: { color: 'var(--color-status-pending)' },
} as const;

const chartConfig: ChartConfig = {
  count: { label: 'Tournaments' },
  ...Object.fromEntries(
    Object.entries(STATUS_CONFIG).map(([key, value]) => [
      key,
      { label: key, color: value.color },
    ])
  ),
};

/** Every submitted tournament by verification status. */
export default function TournamentVerificationChart({
  verificationCounts,
}: TournamentVerificationChartProps) {
  const chartData = useMemo<ChartDataEntry[]>(() => {
    const countFor = (status: VerificationStatus): number =>
      verificationCounts[String(status) as VerificationStatusKey] ?? 0;

    const entries = [
      { key: 'Verified', value: countFor(VerificationStatus.Verified) },
      { key: 'Rejected', value: countFor(VerificationStatus.Rejected) },
      {
        key: 'Awaiting review',
        value:
          countFor(VerificationStatus.PreRejected) +
          countFor(VerificationStatus.PreVerified),
      },
      { key: 'Pending', value: countFor(VerificationStatus.None) },
    ];

    const total = entries.reduce((sum, entry) => sum + entry.value, 0);

    if (total === 0) {
      return [];
    }

    return entries.map(({ key, value }) => ({
      status: key,
      count: value,
      fill: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG].color,
      percentage: (value / total) * 100,
    }));
  }, [verificationCounts]);

  const total = chartData.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <SectionCard
      data-testid="chart-tournament-verification"
      className="flex flex-col"
    >
      <SectionHeader
        icon={ChartPie}
        title="Verification status"
        meta="All submitted tournaments"
      />

      {chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 items-center gap-4 px-4 py-4 sm:grid-cols-[1fr_auto]">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[250px] w-full max-w-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="font-sans"
                    nameKey="status"
                    hideLabel
                    formatter={(value, name, entry) => (
                      <div className="flex flex-1 items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Swatch
                            color={(entry.payload as ChartDataEntry).fill}
                          />
                          <span>{name}</span>
                        </div>
                        <span className="tabular-nums">
                          <span className="font-medium">
                            {formatChartNumber(value as number)}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            (
                            {formatPercentage(
                              (entry.payload as ChartDataEntry).percentage,
                              1
                            )}
                            )
                          </span>
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                innerRadius="60%"
                outerRadius="90%"
                strokeWidth={2}
                stroke="var(--card)"
              >
                <Label
                  content={({ viewBox }) =>
                    viewBox && 'cx' in viewBox && 'cy' in viewBox ? (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-xl font-bold"
                        >
                          {formatChartNumber(total)}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          tournaments
                        </tspan>
                      </text>
                    ) : null
                  }
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <dl className="flex w-full flex-col gap-2 text-xs sm:w-40">
            {chartData.map((entry) => (
              <div key={entry.status} className="flex items-center gap-2">
                <Swatch color={entry.fill} />
                <dt className="min-w-0 flex-1 truncate">{entry.status}</dt>
                <dd className="shrink-0 text-muted-foreground tabular-nums">
                  {formatChartNumber(entry.count)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </SectionCard>
  );
}
