'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

export default function TournamentsByYearChart({
  data,
  className,
}: TournamentsByYearChartProps) {
  const { chartData } = useMemo(() => {
    const processedData: ChartDataItem[] = Object.entries(data)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));

    const totalCount = processedData.reduce((sum, item) => sum + item.count, 0);

    return { chartData: processedData, total: totalCount };
  }, [data]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value?: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <p className="font-bold">Year: {label}</p>
        <p className="text-sm text-muted-foreground">
          Tournaments: {formatChartNumber(payload[0].value || 0)}
        </p>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Tournaments by Year
        </CardTitle>
        <CardDescription>
          Number of verified tournaments by year
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <YAxis stroke={CHART_COLORS.mutedForeground} />
            <Tooltip cursor={false} content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill={CHART_COLORS.primary}
              radius={CHART_CONSTANTS.BORDER_RADIUS}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
