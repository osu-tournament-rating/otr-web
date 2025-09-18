'use client';

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import TierIcon from '@/components/icons/TierIcon';
import { Ruleset } from '@/lib/osu/enums';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { RulesetEnumHelper } from '@/lib/enums';
import RulesetIcon from '../icons/RulesetIcon';
import SimpleTooltip from '../simple-tooltip';
import { useRatingDistribution } from '@/lib/hooks/useRatingDistribution';
import {
  CHART_CONSTANTS,
  CHART_COLORS,
  formatChartNumber,
  formatPercentage,
} from '@/lib/utils/chart';
import { validTiers } from '@/components/icons/TierIcon';

type TierName = (typeof validTiers)[number];

interface RatingDistributionChartProps {
  ratings: Record<string, number>;
  ruleset: Ruleset;
  className?: string;
  userRating?: number;
}

type ChartDataItem = {
  rating: number;
  count: number;
  tier?: {
    tier: string;
    color: string;
    baseRating: number;
  };
  cumulativePercentage?: number;
};

interface ExtendedTooltipProps extends TooltipProps<number, string> {
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: ChartDataItem;
  }>;
  label?: string;
}

function CustomTooltip(props: ExtendedTooltipProps) {
  const { active, payload, label } = props;

  if (!active || !payload?.length) return null;

  const data = payload[0].payload as ChartDataItem;
  const barData = payload.find((p) => p.dataKey === 'count');
  const lineData = payload.find((p) => p.dataKey === 'cumulativePercentage');

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="flex items-center gap-2">
        {data.tier && (
          <TierIcon
            tier={data.tier.tier as TierName}
            subTier={1}
            width={24}
            height={24}
          />
        )}
        <div>
          <p className="font-bold">Rating: {label}</p>
          {data.tier && (
            <p
              className="text-sm font-semibold"
              style={{ color: data.tier.color }}
            >
              {data.tier.tier}
            </p>
          )}
        </div>
      </div>
      {barData && (
        <p className="mt-2 text-sm text-muted-foreground">
          Players: {formatChartNumber(barData.value as number)}
        </p>
      )}
      {lineData && (
        <p className="text-sm text-muted-foreground">
          Cumulative: {formatPercentage(lineData.value as number, 1)}
        </p>
      )}
    </div>
  );
}

interface CustomXAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
}

export default function RatingDistributionChart({
  ratings,
  ruleset,
  className,
}: RatingDistributionChartProps) {
  const rulesetInfo = RulesetEnumHelper.getMetadata(ruleset);
  const { chartData, tierData, isEmpty } = useRatingDistribution({ ratings });

  const CustomXAxisTickWithData = ({ x, y, payload }: CustomXAxisTickProps) => {
    if (x === undefined || y === undefined || !payload) {
      return null;
    }

    const tier = tierData.find((t) => t.baseRating === payload.value);

    if (!tier) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-12} y={5} width={24} height={24}>
          <SimpleTooltip content={`${tier.tier} (${tier.baseRating} TR)`}>
            <div>
              <TierIcon
                tier={tier.tier as TierName}
                subTier={1}
                width={24}
                height={24}
              />
            </div>
          </SimpleTooltip>
        </foreignObject>
      </g>
    );
  };

  if (isEmpty) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RulesetIcon ruleset={ruleset} className="h-6 w-6 fill-primary" />
            {rulesetInfo?.text} Rating Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-[325px] items-center justify-center">
          <p className="text-muted-foreground">
            No data available for this ruleset.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RulesetIcon ruleset={ruleset} className="h-6 w-6 fill-primary" />
          {rulesetInfo?.text} Rating Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer
          width="100%"
          height={CHART_CONSTANTS.DEFAULT_HEIGHT}
        >
          <ComposedChart
            data={chartData}
            margin={CHART_CONSTANTS.DEFAULT_MARGIN}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={CHART_COLORS.mutedForeground}
            />
            <XAxis
              dataKey="rating"
              tick={<CustomXAxisTickWithData />}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.mutedForeground }}
              interval="preserveStartEnd"
              ticks={tierData.map((t) => t.baseRating)}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatChartNumber}
              tickLine={false}
              axisLine={false}
              className="text-xs"
              stroke={CHART_COLORS.mutedForeground}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              className="text-xs"
              stroke={CHART_COLORS.mutedForeground}
              domain={[0, 100]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: CHART_COLORS.accent }}
            />
            <Bar
              dataKey="count"
              radius={CHART_CONSTANTS.BORDER_RADIUS}
              yAxisId="left"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.rating}`}
                  fill={entry.tier?.color || CHART_COLORS.primary}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="cumulativePercentage"
              stroke={CHART_COLORS.primary}
              strokeWidth={2}
              dot={false}
              yAxisId="right"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
