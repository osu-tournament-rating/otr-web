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
import { Gamepad2 } from 'lucide-react';
import { useMemo } from 'react';
import { Ruleset } from '@otr/core/osu';
import { RulesetEnumHelper } from '@/lib/enums';
import RulesetIcon from '../icons/RulesetIcon';
import {
  CHART_CONSTANTS,
  CHART_COLORS,
  formatChartNumber,
} from '@/lib/utils/chart';

interface TournamentsByRulesetChartProps {
  data: Record<string, number>;
  className?: string;
}

interface ChartDataItem {
  ruleset: Ruleset;
  name: string;
  count: number;
}

interface CustomXAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
}

function CustomXAxisTick({ x, y, payload }: CustomXAxisTickProps) {
  if (x === undefined || y === undefined || !payload) {
    return null;
  }

  const ruleset = payload.value as Ruleset;
  const rulesetInfo = RulesetEnumHelper.getMetadata(ruleset);

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-12} y={0} width={24} height={24}>
        <div title={rulesetInfo?.text}>
          <RulesetIcon ruleset={ruleset} className="fill-primary h-6 w-6" />
        </div>
      </foreignObject>
    </g>
  );
}

export default function TournamentsByRulesetChart({
  data,
  className,
}: TournamentsByRulesetChartProps) {
  const { chartData } = useMemo(() => {
    const processedData: ChartDataItem[] = Object.entries(data)
      .map(([rulesetId, count]) => {
        const ruleset = parseInt(rulesetId, 10) as Ruleset;
        const rulesetInfo = RulesetEnumHelper.getMetadata(ruleset);
        return {
          ruleset,
          name: rulesetInfo?.text || 'Unknown',
          count,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const totalCount = processedData.reduce((sum, item) => sum + item.count, 0);

    return { chartData: processedData, total: totalCount };
  }, [data]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: ChartDataItem;
      value?: number;
    }>;
  }) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload as ChartDataItem;
    return (
      <div className="bg-background rounded-lg border p-2 shadow-sm">
        <p className="font-bold">
          Tournaments: {formatChartNumber(item.count)}
        </p>
        <p className="text-muted-foreground text-sm">Ruleset: {item.name}</p>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="text-primary h-6 w-6" />
          Tournaments by Ruleset
        </CardTitle>
        <CardDescription>Verified tournaments by ruleset</CardDescription>
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
              dataKey="ruleset"
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.mutedForeground }}
              tick={<CustomXAxisTick />}
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
