'use client';

import {
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar } from 'lucide-react';
import { useMemo } from 'react';
import {
  CHART_CONSTANTS,
  CHART_COLORS,
  formatChartNumber,
} from '@/lib/utils/chart';

interface TournamentsByYearChartProps {
  data: Record<string, number>;
  className?: string;
}

interface ChartDataItem {
  year: string;
  count: number;
}

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
        Tournaments: {formatChartNumber(payload[0].value || 0)}
      </p>
      <p className="text-sm text-muted-foreground">Year: {label}</p>
    </div>
  );
}

export default function TournamentsByYearChart({
  data,
  className,
}: TournamentsByYearChartProps) {
  const { chartData, yAxisMax } = useMemo(() => {
    const processedData: ChartDataItem[] = Object.entries(data)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));

    const totalCount = processedData.reduce((sum, item) => sum + item.count, 0);
    const maxValue = Math.max(...processedData.map((item) => item.count), 0);

    const roundToNice = (val: number): number => {
      if (val <= 100) return Math.ceil(val / 10) * 10;
      if (val <= 500) return Math.ceil(val / 50) * 50;
      return Math.ceil(val / 100) * 100;
    };

    const yMax = roundToNice(maxValue * 1.1);

    return { chartData: processedData, total: totalCount, yAxisMax: yMax };
  }, [data]);

  return (
    <SectionCard data-testid="chart-tournaments-by-year" className={className}>
      <SectionHeader
        icon={Calendar}
        title="Tournaments by year"
        meta="Verified"
      />
      <div className="px-4 py-4">
        <ResponsiveContainer
          width="100%"
          height={CHART_CONSTANTS.DEFAULT_HEIGHT}
        >
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={CHART_COLORS.mutedForeground}
            />
            <XAxis dataKey="year" stroke={CHART_COLORS.mutedForeground} />
            <YAxis
              stroke={CHART_COLORS.mutedForeground}
              domain={[0, yAxisMax]}
            />
            <Tooltip cursor={false} content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill={CHART_COLORS.primary}
              radius={CHART_CONSTANTS.BORDER_RADIUS}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
