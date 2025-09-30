'use client';

import { useMemo } from 'react';
import {
  BarChart,
  XAxis,
  YAxis,
  Bar,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { VerificationStatus } from '@otr/core/osu';
import { VerificationStatusKey } from '@/lib/orpc/schema/stats';
import {
  CHART_CONSTANTS,
  formatChartNumber,
  formatPercentage,
} from '@/lib/utils/chart';

interface TournamentVerificationChartProps {
  verificationCounts: Partial<Record<VerificationStatusKey, number>>;
  className?: string;
}

interface ChartDataEntry {
  status: string;
  count: number;
  fill: string;
  percentage: number;
}

const STATUS_CONFIG = {
  Verified: {
    label: 'Verified',
    color: 'var(--color-status-verified)',
    icon: CheckCircle,
  },
  'Awaiting Review': {
    label: 'Awaiting Review',
    color: 'var(--color-warning)',
    icon: AlertTriangle,
  },
  Rejected: {
    label: 'Rejected',
    color: 'var(--color-status-rejected)',
    icon: XCircle,
  },
  Pending: {
    label: 'Pending',
    color: 'var(--color-status-pending)',
    icon: Clock,
  },
} as const;

export default function TournamentVerificationChart({
  verificationCounts,
  className,
}: TournamentVerificationChartProps) {
  const chartConfig: ChartConfig = {
    count: { label: 'Tournaments' },
    ...Object.entries(STATUS_CONFIG).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: { label: key, color: value.color },
      }),
      {}
    ),
  };

  const chartData = useMemo(() => {
    if (!verificationCounts) return [];

    const getCountForStatus = (status: VerificationStatus): number =>
      verificationCounts[String(status) as VerificationStatusKey] ?? 0;

    const total = Object.values(verificationCounts).reduce(
      (sum, count) => sum + count,
      0
    );

    if (total === 0) return [];

    const dataEntries = [
      {
        key: 'Verified',
        value: getCountForStatus(VerificationStatus.Verified),
      },
      {
        key: 'Awaiting Review',
        value:
          getCountForStatus(VerificationStatus.PreRejected) +
          getCountForStatus(VerificationStatus.PreVerified),
      },
      {
        key: 'Rejected',
        value: getCountForStatus(VerificationStatus.Rejected),
      },
      {
        key: 'Pending',
        value: getCountForStatus(VerificationStatus.None),
      },
    ];

    return dataEntries
      .filter(({ value }) => value > 0)
      .map(({ key, value }) => ({
        status: key,
        count: value,
        fill: STATUS_CONFIG[key as keyof typeof STATUS_CONFIG].color,
        percentage: (value / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [verificationCounts]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Tournaments by Verification Status</CardTitle>
          <CardDescription>No verification data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = chartData.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="text-primary h-6 w-6" />
          Tournament Verification Status
        </CardTitle>
        <CardDescription>
          Distribution of {formatChartNumber(total)} tournaments by verification
          status
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0 font-sans">
        <ChartContainer
          config={chartConfig}
          className="mx-auto max-h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              data={chartData}
              margin={CHART_CONSTANTS.VERTICAL_MARGIN}
              layout="vertical"
            >
              <YAxis
                dataKey="status"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 14, fill: 'var(--foreground)' }}
                interval={0}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="font-sans"
                    labelFormatter={(value) => value}
                    formatter={(value, name, entry) => (
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: entry.payload.fill }}
                          />
                          <span className="font-medium">
                            {formatChartNumber(value as number)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          (
                          {formatPercentage(
                            (entry.payload as ChartDataEntry).percentage,
                            1
                          )}
                          )
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="count" radius={5} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
