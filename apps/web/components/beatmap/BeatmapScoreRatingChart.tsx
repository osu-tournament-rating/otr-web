'use client';

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import { Card, CardContent } from '../ui/card';
import { ChartContainer, ChartConfig } from '../ui/chart';
import type { BeatmapScoreRatingPoint } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapScoreRatingChartProps {
  data: BeatmapScoreRatingPoint[];
  className?: string;
}

interface DensityCell {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  density: number;
}

const DENSITY_X_BINS = 20;
const DENSITY_Y_BINS = 15;
const DENSITY_MIN_OPACITY = 0.12;
const DENSITY_MAX_OPACITY = 0.9;

const RATING_BASE_UNIT = 100;
const SCORE_STEP = 50000;

const chartConfig = {
  density: {
    label: 'Play density',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

const getNiceStep = (
  range: number,
  baseUnit: number,
  targetTicks: number = 8
): number => {
  if (range <= 0) return baseUnit;

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
  step: number,
  minimumAllowed: number = Number.NEGATIVE_INFINITY
): [number, number] => {
  const domainMin = Math.floor(min / step) * step;
  const domainMax = Math.ceil(max / step) * step;

  if (domainMin === domainMax) {
    return [Math.max(minimumAllowed, domainMin - step), domainMax + step];
  }

  return [Math.max(minimumAllowed, domainMin), domainMax];
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
  const maxLogCount = Math.log1p(maxCount);

  const cells: DensityCell[] = [];
  for (let i = 0; i < DENSITY_X_BINS; i++) {
    for (let j = 0; j < DENSITY_Y_BINS; j++) {
      if (grid[i][j] > 0) {
        cells.push({
          x1: xMin + i * xBinSize,
          x2: xMin + (i + 1) * xBinSize,
          y1: yMin + j * yBinSize,
          y2: yMin + (j + 1) * yBinSize,
          density: Math.log1p(grid[i][j]) / maxLogCount,
        });
      }
    }
  }

  return cells;
};

interface DensityCellsProps {
  cells: DensityCell[];
}

/**
 * Draws every density cell as a single SVG layer using the axis scales from
 * recharts. Plain rects avoid the store subscription and reconciliation cost of
 * emitting a `<ReferenceArea>` for every occupied cell.
 */
function DensityCells({ cells }: DensityCellsProps) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();

  if (!xScale || !yScale) return null;

  return (
    <g className="density-cells" aria-hidden="true">
      {cells.map((cell, index) => {
        const px1 = xScale(cell.x1);
        const px2 = xScale(cell.x2);
        const py1 = yScale(cell.y1);
        const py2 = yScale(cell.y2);
        if (px1 == null || px2 == null || py1 == null || py2 == null)
          return null;

        return (
          <rect
            key={`density-${index}`}
            x={Math.min(px1, px2)}
            y={Math.min(py1, py2)}
            width={Math.abs(px2 - px1)}
            height={Math.abs(py2 - py1)}
            shapeRendering="crispEdges"
            style={{
              fill: 'var(--color-density)',
              fillOpacity:
                DENSITY_MIN_OPACITY +
                cell.density * (DENSITY_MAX_OPACITY - DENSITY_MIN_OPACITY),
            }}
          />
        );
      })}
    </g>
  );
}

export default function BeatmapScoreRatingChart({
  data,
  className,
}: BeatmapScoreRatingChartProps) {
  const { densityCells, xDomain, yDomain, xTicks, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return {
        densityCells: [] as DensityCell[],
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
    const xDom = getNiceDomain(xMin, xMax, xStep, 0);
    const yDom = getNiceDomain(yMin, yMax, SCORE_STEP, 0);

    return {
      densityCells: computeDensityGrid(data, xDom, yDom),
      xDomain: xDom,
      yDomain: yDom,
      xTicks: generateTicks(xDom[0], xDom[1], xStep),
      yTicks: generateTicks(yDom[0], yDom[1], SCORE_STEP),
    };
  }, [data]);

  // Two invisible anchor points at the domain corners are enough for recharts
  // v3 to build the axis scales without rendering a transparent node per score.
  const scaleAnchors = useMemo(
    () => [
      { playerRating: xDomain[0], score: yDomain[0] },
      { playerRating: xDomain[1], score: yDomain[1] },
    ],
    [xDomain, yDomain]
  );

  if (data.length === 0) {
    return (
      <Card data-testid="beatmap-score-rating-chart" className={className}>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No score data available for this beatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="beatmap-score-rating-chart" className={className}>
      <CardContent className="font-sans">
        <ChartContainer
          config={chartConfig}
          className="h-[350px] w-full"
          role="img"
          aria-label="Score versus player TR density heatmap"
        >
          <ScatterChart margin={{ top: 8, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              strokeOpacity={0.65}
            />
            <XAxis
              type="number"
              dataKey="playerRating"
              name="TR"
              domain={xDomain}
              ticks={xTicks}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--border)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v) => v.toFixed(0)}
              label={{
                value: 'TR',
                position: 'insideBottom',
                offset: -15,
                fill: 'var(--muted-foreground)',
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="score"
              name="Score"
              domain={yDomain}
              ticks={yTicks}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickLine={{ stroke: 'var(--border)' }}
              axisLine={{ stroke: 'var(--border)' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'Score',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: 'var(--muted-foreground)',
                fontSize: 11,
              }}
            />

            {/* Invisible series so recharts v3 establishes the axis scales the
              density ReferenceAreas position against. Without a registered
              graphical item, v3 derives no scale from domain/ticks alone. */}
            <Scatter
              data={scaleAnchors}
              dataKey="score"
              fillOpacity={0}
              legendType="none"
              isAnimationActive={false}
            />

            <DensityCells cells={densityCells} />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
