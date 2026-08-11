'use client';

import { TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
// @ts-expect-error -- echarts-gl ships no TypeScript declarations.
import { Scatter3DChart } from 'echarts-gl/charts';
// @ts-expect-error -- echarts-gl ships no TypeScript declarations.
import { Grid3DComponent } from 'echarts-gl/components';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { EmptyState } from '@/components/beatmap/BeatmapSection';
import {
  RANK_RANGE_BUCKETS,
  type RankRangeBucketKey,
} from '@/lib/beatmaps/rankRange';
import { cn } from '@/lib/utils';
import {
  formatChartNumber,
  formatKilo,
  formatPercentage,
} from '@/lib/utils/chart';
import { getBeatmapModLabel, getModColor } from '@/lib/utils/mods';
import type { Mods } from '@otr/core/osu';

echarts.use([
  CanvasRenderer,
  TooltipComponent,
  Grid3DComponent,
  Scatter3DChart,
]);

/** Value formatting shared with the 2D panes' tick formatters. */
export type Scatter3DAxisFormat = 'kilo' | 'percent' | 'rating';

export interface Scatter3DPoint {
  x: number;
  y: number;
  rankRange: RankRangeBucketKey;
  /** Raw score mods bitmask; colored with `getModColor` like every other card. */
  mods: number;
}

interface BeatmapScoreScatter3DProps {
  /** Already view-filtered by the card; this component only draws. */
  points: Scatter3DPoint[];
  xLabel: string;
  xFormat: Scatter3DAxisFormat;
  yLabel: string;
  yFormat: Exclude<Scatter3DAxisFormat, 'rating'>;
  className?: string;
}

const RANK_RANGE_LABELS = RANK_RANGE_BUCKETS.map((bucket) => bucket.label);
const RANK_RANGE_INDEX = new Map<RankRangeBucketKey, number>(
  RANK_RANGE_BUCKETS.map((bucket, index) => [bucket.key, index])
);

const CSS_VAR_PATTERN = /^var\(\s*(--[\w-]+)\s*\)$/;

let scratchContext: CanvasRenderingContext2D | null | undefined;

/** 1x1 scratch canvas used to force any CSS color into sRGB bytes. */
function getScratchContext(): CanvasRenderingContext2D | null {
  if (scratchContext !== undefined) return scratchContext;

  if (typeof document === 'undefined') {
    scratchContext = null;
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  scratchContext = canvas.getContext('2d', { willReadFrequently: true });

  return scratchContext;
}

/**
 * Assigning an invalid color leaves `fillStyle` at its previous value, so two
 * different sentinels tell a rejected value apart from one that legitimately
 * resolves to a sentinel's color (plain black being the obvious case).
 */
function isParseableColor(
  context: CanvasRenderingContext2D,
  value: string
): boolean {
  context.fillStyle = '#ff0000';
  context.fillStyle = value;
  const fromRed = context.fillStyle;

  context.fillStyle = '#00ff00';
  context.fillStyle = value;

  return context.fillStyle === fromRed;
}

/**
 * Composites the given color layers (outermost first) and reads the result
 * back as sRGB. The theme tokens are authored in `oklch()`/`lab()`, which
 * zrender's color parser does not understand — it silently falls back to
 * black — so every color handed to echarts goes through this first.
 */
function paintToSrgb(layers: string[]): string | null {
  const context = getScratchContext();
  if (!context) return null;

  context.clearRect(0, 0, 1, 1);

  let painted = false;
  for (const layer of layers) {
    if (!isParseableColor(context, layer)) continue;

    context.fillStyle = layer;
    context.fillRect(0, 0, 1, 1);
    painted = true;
  }

  if (!painted) return null;

  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`;
}

/**
 * echarts paints to canvas, so theme CSS variables have to be resolved to
 * concrete colors first. Resolves `var(--x)` chains against the document root,
 * then normalizes the result to an `rgba()` string zrender can parse.
 */
function resolveCssColor(value: string, depth = 0): string {
  const trimmed = value.trim();
  if (typeof window === 'undefined' || depth > 4) return trimmed;

  const match = CSS_VAR_PATTERN.exec(trimmed);
  if (match) {
    const resolved = getComputedStyle(
      document.documentElement
    ).getPropertyValue(match[1]);
    if (resolved.trim()) return resolveCssColor(resolved, depth + 1);
    return trimmed;
  }

  return paintToSrgb([trimmed]) ?? trimmed;
}

/**
 * The WebGL layer cannot be transparent, so the 3D box has to be filled with
 * whatever the card actually paints behind it. Walks up to the nearest opaque
 * background, compositing any translucent layers on the way (the section card
 * is `bg-muted/75` in dark mode).
 */
function resolveBackdropColor(element: HTMLElement): string | null {
  if (typeof window === 'undefined') return null;

  const layers: string[] = [];

  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const background = getComputedStyle(node).backgroundColor;
    const normalized = paintToSrgb([background]);
    if (!normalized) continue;

    const alpha = Number(normalized.slice(normalized.lastIndexOf(',') + 1, -1));
    if (alpha <= 0) continue;

    layers.push(normalized);
    if (alpha >= 1) break;
  }

  return paintToSrgb(layers.reverse());
}

function formatAxisValue(
  value: number,
  format: Scatter3DAxisFormat,
  precise: boolean
): string {
  switch (format) {
    case 'percent':
      return formatPercentage(value, precise ? 2 : 0);
    case 'rating':
      return formatChartNumber(Math.round(value));
    case 'kilo':
    default:
      return precise ? formatChartNumber(Math.round(value)) : formatKilo(value);
  }
}

/** Mod labels are alphanumeric, but the tooltip is raw HTML — stay defensive. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * WebGL scatter for the beatmap score sample. Lives in its own module so the
 * echarts + echarts-gl chunk is only fetched when the 3D toggle is used.
 */
export default function BeatmapScoreScatter3D({
  points,
  xLabel,
  xFormat,
  yLabel,
  yFormat,
  className,
}: BeatmapScoreScatter3DProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);
  const { resolvedTheme } = useTheme();
  const [initFailed, setInitFailed] = React.useState(false);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // StrictMode mounts effects twice; reuse any instance already bound to the
    // node instead of leaking a second canvas.
    let chart = echarts.getInstanceByDom(element) ?? null;
    if (!chart) {
      try {
        chart = echarts.init(element);
      } catch {
        setInitFailed(true);
        return;
      }
    }

    chartRef.current = chart;

    const observer = new ResizeObserver(() => chart?.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      chart?.dispose();
      chartRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart || points.length === 0) return;

    const mutedColor = resolveCssColor('var(--muted-foreground)');
    const borderColor = resolveCssColor('var(--border)');
    const popoverColor = resolveCssColor('var(--popover)');
    const popoverForegroundColor = resolveCssColor('var(--popover-foreground)');
    const backdropColor =
      (containerRef.current && resolveBackdropColor(containerRef.current)) ||
      resolveCssColor('var(--card)');

    const data = points.map((point) => ({
      // echarts grid3D maps [xAxis3D, yAxis3D (depth), zAxis3D (vertical)], so
      // the rank-range category sits on the depth axis and the measured value
      // on the vertical one.
      value: [point.x, RANK_RANGE_INDEX.get(point.rankRange) ?? 0, point.y] as [
        number,
        number,
        number,
      ],
      itemStyle: {
        color: resolveCssColor(getModColor(point.mods as Mods)),
        opacity: 0.75,
      },
    }));

    const axisCommon = {
      nameTextStyle: { color: mutedColor, fontSize: 11 },
      // Default gap lets the axis name sit on top of the tick labels.
      nameGap: 26,
      axisLine: { lineStyle: { color: borderColor } },
      // echarts 5 reads `color`/`fontSize` directly; echarts-gl's older option
      // path still honours the nested `textStyle`, so set both.
      axisLabel: {
        color: mutedColor,
        fontSize: 10,
        textStyle: { color: mutedColor, fontSize: 10 },
      },
      splitLine: { lineStyle: { color: borderColor } },
      axisTick: { lineStyle: { color: borderColor } },
    };

    chart.setOption(
      {
        backgroundColor: backdropColor,
        tooltip: {
          show: true,
          backgroundColor: popoverColor,
          borderColor,
          borderWidth: 1,
          padding: [6, 10],
          textStyle: { color: popoverForegroundColor, fontSize: 12 },
          formatter: (params: { dataIndex?: number }) => {
            const point =
              params.dataIndex == null ? undefined : points[params.dataIndex];
            if (!point) return '';

            const rankLabel =
              RANK_RANGE_BUCKETS.find(
                (bucket) => bucket.key === point.rankRange
              )?.label ?? '';
            const chipColor = resolveCssColor(getModColor(point.mods as Mods));
            const row = (label: string, value: string) =>
              `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:16px">` +
              `<span style="color:${mutedColor}">${escapeHtml(label)}</span>` +
              `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums">${escapeHtml(value)}</span>` +
              `</div>`;

            return (
              `<div style="min-width:11rem;display:flex;flex-direction:column;gap:4px">` +
              `<div style="display:flex;align-items:center;gap:6px;font-weight:500;padding-bottom:4px;border-bottom:1px solid ${borderColor}">` +
              `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${chipColor}"></span>` +
              `<span>${escapeHtml(getBeatmapModLabel(point.mods))}</span>` +
              `</div>` +
              row(xLabel, formatAxisValue(point.x, xFormat, true)) +
              row(yLabel, formatAxisValue(point.y, yFormat, true)) +
              row('Rank range', rankLabel) +
              `</div>`
            );
          },
        },
        xAxis3D: {
          ...axisCommon,
          type: 'value',
          name: xLabel,
          axisLabel: {
            ...axisCommon.axisLabel,
            formatter: (value: number) =>
              formatAxisValue(value, xFormat, false),
          },
        },
        yAxis3D: {
          ...axisCommon,
          type: 'category',
          name: 'Rank range',
          data: RANK_RANGE_LABELS,
        },
        zAxis3D: {
          ...axisCommon,
          type: 'value',
          name: yLabel,
          axisLabel: {
            ...axisCommon.axisLabel,
            formatter: (value: number) =>
              formatAxisValue(value, yFormat, false),
          },
        },
        grid3D: {
          boxWidth: 110,
          boxDepth: 70,
          axisPointer: { show: false },
          environment: backdropColor,
          viewControl: {
            alpha: 12,
            beta: 25,
            distance: 200,
            autoRotate: false,
            rotateSensitivity: 1.5,
          },
        },
        series: [
          {
            type: 'scatter3D',
            symbolSize: 7,
            data,
          },
        ],
      },
      { notMerge: true }
    );
  }, [points, xLabel, xFormat, yLabel, yFormat, resolvedTheme]);

  if (initFailed) {
    return (
      <EmptyState>
        3D view is unavailable — this browser could not start WebGL.
      </EmptyState>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="beatmap-score-scatter-3d"
      className={cn('w-full', className)}
      role="img"
      aria-label={`3D scatter of ${yLabel} against ${xLabel} by tournament rank range`}
    />
  );
}
