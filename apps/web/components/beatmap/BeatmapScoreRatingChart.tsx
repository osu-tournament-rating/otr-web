'use client';

import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import {
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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

const getChartColors = (theme?: string) => ({
  grid: theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#9ca3af' : '#6b7280',
});

interface DensityCell {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  density: number;
}

const DENSITY_X_BINS = 20;
const DENSITY_Y_BINS = 15;
const DENSITY_MIN_OPACITY = 0.05;
const DENSITY_MAX_OPACITY = 0.35;

const RATING_BASE_UNIT = 100;
const SCORE_STEP = 50000;

const getNiceStep = (
  range: number,
  baseUnit: number,
  targetTicks: number = 8
): number => {
  const rawStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceMultiplier =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceMultiplier * magnitude;
  return Math.max(baseUnit, Math.ceil(step / baseUnit) * baseUnit);
};

const getNiceDomain = (
  min: number,
  max: number,
  step: number
): [number, number] => {
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
};

const generateTicks = (min: number, max: number, step: number): number[] => {
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) {
    ticks.push(v);
  }
  return ticks;
};

const computeDensityGrid = (
  data: BeatmapScoreRatingPoint[],
  xDomain: [number, number],
  yDomain: [number, number]
): DensityCell[] => {
  if (data.length === 0) return [];

  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;

  const xBinSize = (xMax - xMin) / DENSITY_X_BINS;
  const yBinSize = (yMax - yMin) / DENSITY_Y_BINS;

  if (xBinSize === 0 || yBinSize === 0) return [];

  const grid: number[][] = Array.from({ length: DENSITY_X_BINS }, () =>
    Array(DENSITY_Y_BINS).fill(0)
  );

  for (const point of data) {
    const xBin = Math.min(
      Math.max(Math.floor((point.playerRating - xMin) / xBinSize), 0),
      DENSITY_X_BINS - 1
    );
    const yBin = Math.min(
      Math.max(Math.floor((point.score - yMin) / yBinSize), 0),
      DENSITY_Y_BINS - 1
    );
    grid[xBin][yBin]++;
  }

  const maxCount = Math.max(...grid.flat());
  if (maxCount === 0) return [];

  const cells: DensityCell[] = [];
  for (let i = 0; i < DENSITY_X_BINS; i++) {
    for (let j = 0; j < DENSITY_Y_BINS; j++) {
      if (grid[i][j] > 0) {
        cells.push({
          x1: xMin + i * xBinSize,
          x2: xMin + (i + 1) * xBinSize,
          y1: yMin + j * yBinSize,
          y2: yMin + (j + 1) * yBinSize,
          density: grid[i][j] / maxCount,
        });
      }
    }
  }

  return cells;
};

const MOD_COLORS: Record<ModCategory, string> = {
  nm: 'var(--chart-1)',
  hr: 'var(--mod-hard-rock)',
  hd: 'var(--mod-hidden)',
  dt: 'var(--mod-double-time)',
  other: 'var(--chart-3)',
};

export default function BeatmapScoreRatingChart({
  data,
  className,
}: BeatmapScoreRatingChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);
  const [visibleMods, setVisibleMods] = useState<Set<ModCategory>>(
    new Set(['nm', 'hr', 'hd', 'dt', 'other'])
  );

  const handleLegendClick = (entry: { value: string }) => {
    const modMap: Record<string, ModCategory> = {
      'No Mod': 'nm',
      'Hard Rock': 'hr',
      Hidden: 'hd',
      'Double Time': 'dt',
      Other: 'other',
    };
    const mod = modMap[entry.value];
    if (!mod) return;

    setVisibleMods((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const { groupedData, densityByMod, xDomain, yDomain, xTicks, yTicks } =
    useMemo(() => {
      const grouped = {
        nm: data.filter((d) => getModCategory(d.mods) === 'nm'),
        hr: data.filter((d) => getModCategory(d.mods) === 'hr'),
        hd: data.filter((d) => getModCategory(d.mods) === 'hd'),
        dt: data.filter((d) => getModCategory(d.mods) === 'dt'),
        other: data.filter((d) => getModCategory(d.mods) === 'other'),
      };

      if (data.length === 0) {
        return {
          groupedData: grouped,
          densityByMod: {} as Record<ModCategory, DensityCell[]>,
          xDomain: [0, 1] as [number, number],
          yDomain: [0, 1] as [number, number],
          xTicks: [] as number[],
          yTicks: [] as number[],
        };
      }

      const xValues = data.map((d) => d.playerRating);
      const yValues = data.map((d) => d.score);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);

      const xStep = getNiceStep(xMax - xMin, RATING_BASE_UNIT);
      const xDom = getNiceDomain(xMin, xMax, xStep);
      const yDom = getNiceDomain(yMin, yMax, SCORE_STEP);

      const density: Record<ModCategory, DensityCell[]> = {
        nm: computeDensityGrid(grouped.nm, xDom, yDom),
        hr: computeDensityGrid(grouped.hr, xDom, yDom),
        hd: computeDensityGrid(grouped.hd, xDom, yDom),
        dt: computeDensityGrid(grouped.dt, xDom, yDom),
        other: computeDensityGrid(grouped.other, xDom, yDom),
      };

      return {
        groupedData: grouped,
        densityByMod: density,
        xDomain: xDom,
        yDomain: yDom,
        xTicks: generateTicks(xDom[0], xDom[1], xStep),
        yTicks: generateTicks(yDom[0], yDom[1], SCORE_STEP),
      };
    }, [data]);

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
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            No score data available for this beatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Score vs Player Rating</CardTitle>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ScatterChart margin={{ top: 25, right: 10, bottom: 25, left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              type="number"
              dataKey="playerRating"
              name="Rating"
              domain={xDomain}
              ticks={xTicks}
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={(v) => v.toFixed(0)}
              label={{
                value: 'Player Rating',
                position: 'insideBottom',
                offset: -15,
                fill: colors.text,
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="score"
              name="Score"
              domain={yDomain}
              ticks={yTicks}
              tick={{ fill: colors.text, fontSize: 11 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'Score',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: colors.text,
                fontSize: 11,
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{
                fontSize: 11,
                color: colors.text,
                paddingBottom: 10,
                cursor: 'pointer',
              }}
              onClick={handleLegendClick}
              payload={[
                ...(groupedData.nm.length > 0
                  ? [
                      {
                        value: 'No Mod',
                        type: 'square' as const,
                        color: visibleMods.has('nm')
                          ? 'var(--chart-1)'
                          : 'rgba(128,128,128,0.3)',
                      },
                    ]
                  : []),
                ...(groupedData.hr.length > 0
                  ? [
                      {
                        value: 'Hard Rock',
                        type: 'square' as const,
                        color: visibleMods.has('hr')
                          ? 'var(--mod-hard-rock)'
                          : 'rgba(128,128,128,0.3)',
                      },
                    ]
                  : []),
                ...(groupedData.hd.length > 0
                  ? [
                      {
                        value: 'Hidden',
                        type: 'square' as const,
                        color: visibleMods.has('hd')
                          ? 'var(--mod-hidden)'
                          : 'rgba(128,128,128,0.3)',
                      },
                    ]
                  : []),
                ...(groupedData.dt.length > 0
                  ? [
                      {
                        value: 'Double Time',
                        type: 'square' as const,
                        color: visibleMods.has('dt')
                          ? 'var(--mod-double-time)'
                          : 'rgba(128,128,128,0.3)',
                      },
                    ]
                  : []),
                ...(groupedData.other.length > 0
                  ? [
                      {
                        value: 'Other',
                        type: 'square' as const,
                        color: visibleMods.has('other')
                          ? 'var(--chart-3)'
                          : 'rgba(128,128,128,0.3)',
                      },
                    ]
                  : []),
              ]}
            />

            {(Object.keys(densityByMod) as ModCategory[])
              .filter((mod) => visibleMods.has(mod))
              .map((mod) =>
                densityByMod[mod]?.map((cell, i) => (
                  <ReferenceArea
                    key={`density-${mod}-${i}`}
                    x1={cell.x1}
                    x2={cell.x2}
                    y1={cell.y1}
                    y2={cell.y2}
                    fill={MOD_COLORS[mod]}
                    fillOpacity={
                      DENSITY_MIN_OPACITY +
                      cell.density * (DENSITY_MAX_OPACITY - DENSITY_MIN_OPACITY)
                    }
                    stroke="none"
                  />
                ))
              )}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
