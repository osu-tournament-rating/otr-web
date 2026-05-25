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
import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { LobbySizeEnumHelper } from '@/lib/enum-helpers';
import {
  CHART_CONSTANTS,
  CHART_COLORS,
  formatChartNumber,
} from '@/lib/utils/chart';

interface TournamentsByLobbySizeChartProps {
  data: Record<string, number>;
  className?: string;
}

interface ChartDataItem {
  lobbySize: number;
  name: string;
  count: number;
}

export default function TournamentsByLobbySizeChart({
  data,
  className,
}: TournamentsByLobbySizeChartProps) {
  const { chartData } = useMemo(() => {
    const processedData: ChartDataItem[] = Object.entries(data)
      .map(([lobbySize, count]) => ({
        lobbySize: parseInt(lobbySize, 10),
        name: LobbySizeEnumHelper.toString(parseInt(lobbySize, 10)),
        count,
      }))
      .sort((a, b) => a.lobbySize - b.lobbySize);

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
      <div className="bg-background rounded-lg border p-2 shadow-sm">
        <p className="font-bold">
          Tournaments: {formatChartNumber(payload[0].value || 0)}
        </p>
        <p className="text-muted-foreground text-sm">Lobby Size: {label}</p>
      </div>
    );
  };

  return (
    <Card data-testid="chart-tournaments-by-lobby-size" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="text-primary h-6 w-6" />
          Tournaments by Team Size
        </CardTitle>
        <CardDescription>Verified tournaments by team size</CardDescription>
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
            <XAxis
              dataKey="name"
              stroke={CHART_COLORS.mutedForeground}
              interval={0}
            />
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
