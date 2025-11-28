'use client';

import { useTheme } from 'next-themes';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ChartContainer, ChartConfig } from '../ui/chart';
import type { BeatmapScoreRatingPoint } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapScoreRatingChartProps {
  data: BeatmapScoreRatingPoint[];
  className?: string;
}

const MOD_FLAGS = {
  None: 0,
  NoFail: 1,
  Hidden: 8,
  HardRock: 16,
  DoubleTime: 64,
  Nightcore: 512,
  SpunOut: 4096,
} as const;

type ModCategory = 'nm' | 'hd' | 'hr' | 'dt' | 'other';

const getModCategory = (mods: number): ModCategory => {
  const cleanMods = mods & ~MOD_FLAGS.NoFail & ~MOD_FLAGS.SpunOut;

  if (cleanMods === MOD_FLAGS.None) return 'nm';
  if (cleanMods === MOD_FLAGS.HardRock) return 'hr';
  if (cleanMods === MOD_FLAGS.Hidden) return 'hd';
  if (cleanMods === MOD_FLAGS.DoubleTime || cleanMods === MOD_FLAGS.Nightcore)
    return 'dt';
  return 'other';
};

const renderTriangle = (props: { cx?: number; cy?: number; fill?: string }) => {
  const { cx = 0, cy = 0, fill = '#000' } = props;
  return (
    <polygon
      points={`${cx},${cy - 6} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`}
      fill={fill}
    />
  );
};

const renderSquare = (props: { cx?: number; cy?: number; fill?: string }) => {
  const { cx = 0, cy = 0, fill = '#000' } = props;
  return <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={fill} />;
};

const renderDiamond = (props: { cx?: number; cy?: number; fill?: string }) => {
  const { cx = 0, cy = 0, fill = '#000' } = props;
  return (
    <polygon
      points={`${cx},${cy - 6} ${cx + 5},${cy} ${cx},${cy + 6} ${cx - 5},${cy}`}
      fill={fill}
    />
  );
};

const getChartColors = (theme?: string) => ({
  grid:
    theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
});

export default function BeatmapScoreRatingChart({
  data,
  className,
}: BeatmapScoreRatingChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  const groupedData = {
    nm: data.filter((d) => getModCategory(d.mods) === 'nm'),
    hr: data.filter((d) => getModCategory(d.mods) === 'hr'),
    hd: data.filter((d) => getModCategory(d.mods) === 'hd'),
    dt: data.filter((d) => getModCategory(d.mods) === 'dt'),
    other: data.filter((d) => getModCategory(d.mods) === 'other'),
  };

  const chartConfig: ChartConfig = {
    nm: { label: 'No Mod', color: 'var(--chart-1)' },
    hr: { label: 'Hard Rock', color: 'var(--mod-hard-rock)' },
    hd: { label: 'Hidden', color: 'var(--mod-hidden)' },
    dt: { label: 'Double Time', color: 'var(--mod-double-time)' },
    other: { label: 'Other', color: 'var(--chart-3)' },
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Score vs Player Rating</CardTitle>
          <CardDescription>No score data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Score vs Player Rating</CardTitle>
        <CardDescription>
          Performance distribution by player rating and mod selection
        </CardDescription>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                type="number"
                dataKey="playerRating"
                name="Rating"
                tick={{ fill: colors.text, fontSize: 12 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={(v) => v.toFixed(0)}
              />
              <YAxis
                type="number"
                dataKey="score"
                name="Score"
                tick={{ fill: colors.text, fontSize: 12 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <ZAxis range={[40, 40]} />
              <RechartsTooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${colors.grid}`,
                  borderRadius: '6px',
                }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const point = payload[0].payload as BeatmapScoreRatingPoint;
                  return (
                    <div className="rounded border bg-background p-2 text-xs">
                      <div>Rating: {point.playerRating.toFixed(0)}</div>
                      <div>Score: {point.score.toLocaleString()}</div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                payload={[
                  {
                    value: 'No Mod',
                    type: 'circle',
                    color: 'var(--chart-1)',
                  },
                  {
                    value: 'Hard Rock',
                    type: 'triangle',
                    color: 'var(--mod-hard-rock)',
                  },
                  {
                    value: 'Hidden',
                    type: 'square',
                    color: 'var(--mod-hidden)',
                  },
                  {
                    value: 'Double Time',
                    type: 'diamond',
                    color: 'var(--mod-double-time)',
                  },
                  ...(groupedData.other.length > 0
                    ? [
                        {
                          value: 'Other',
                          type: 'circle' as const,
                          color: 'var(--chart-3)',
                        },
                      ]
                    : []),
                ]}
              />

              {groupedData.nm.length > 0 && (
                <Scatter
                  name="No Mod"
                  data={groupedData.nm}
                  fill="var(--chart-1)"
                />
              )}

              {groupedData.hr.length > 0 && (
                <Scatter
                  name="Hard Rock"
                  data={groupedData.hr}
                  fill="var(--mod-hard-rock)"
                  shape={renderTriangle}
                />
              )}

              {groupedData.hd.length > 0 && (
                <Scatter
                  name="Hidden"
                  data={groupedData.hd}
                  fill="var(--mod-hidden)"
                  shape={renderSquare}
                />
              )}

              {groupedData.dt.length > 0 && (
                <Scatter
                  name="Double Time"
                  data={groupedData.dt}
                  fill="var(--mod-double-time)"
                  shape={renderDiamond}
                />
              )}

              {groupedData.other.length > 0 && (
                <Scatter
                  name="Other"
                  data={groupedData.other}
                  fill="var(--chart-3)"
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
