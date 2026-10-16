'use client';

import type * as React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import {
  ChartTooltipContent,
  type ChartTooltipPayloadItem,
} from '@/components/kit/charts/ChartTooltip';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  CHART_BAR_RADIUS,
  CHART_CURSOR,
  CHART_MARGIN,
  chartAxisProps,
  chartGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatCountTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getNiceTicks,
} from '@/lib/kit/charts/ticks';
import { seriesColor } from '@/lib/kit/color/categorical';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

import type { CountBar } from './stats-data';

/** Rows run left to right, so their data end is on the right. */
const ROW_BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];

/** Room for half the last count label, which centres on the right edge. */
const ROW_MARGIN = { ...CHART_MARGIN, right: 20 } as const;

/** Vertical gridlines for rows, where the count runs along the bottom. */
const ROW_GRID_PROPS = {
  ...chartGridProps,
  horizontal: false,
  vertical: true,
} as const;

function barOf(item: ChartTooltipPayloadItem): CountBar | undefined {
  return item.payload as CountBar | undefined;
}

/**
 * A count per category on the kit chart parts. `columns` stand on a
 * category axis along the bottom; `rows` put the categories on the left,
 * for long names. One series in slot 1 of the fixed palette, unless each
 * bar brings its own `fill` (the verification colours).
 */
export function CountBarChart({
  data,
  layout = 'columns',
  valueName,
  categoryTicks,
  footer,
  className,
}: {
  data: readonly CountBar[];
  layout?: 'columns' | 'rows';
  /** What is counted, for the tooltip row: "Tournaments". */
  valueName: string;
  /** Category labels to tick, when not every label fits (years). */
  categoryTicks?: readonly string[];
  /** A tooltip footer for the hovered bar, such as its share. */
  footer?: (bar: CountBar) => React.ReactNode;
  className?: string;
}) {
  const isNarrow = useIsNarrowChart();
  const max = Math.max(0, ...data.map((bar) => bar.count));
  // A count running along the bottom thins its ticks on phones, as time
  // axes do; a value axis on the left keeps six.
  const valueTicks = getNiceTicks(0, max, {
    integer: true,
    maxTicks:
      layout === 'rows' && isNarrow ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS,
  });
  const ownFills = data.some((bar) => bar.fill !== undefined);
  // Every label shows unless `categoryTicks` picks some.
  const categoryAxis = {
    ...chartAxisProps,
    dataKey: 'label',
    type: 'category' as const,
    ticks: categoryTicks ? [...categoryTicks] : undefined,
    interval: 0 as const,
  };

  return (
    <ChartContainer
      config={{}}
      className={cn('aspect-auto h-60 w-full', className)}
    >
      <BarChart
        data={[...data]}
        layout={layout === 'rows' ? 'vertical' : 'horizontal'}
        margin={layout === 'rows' ? ROW_MARGIN : CHART_MARGIN}
        barCategoryGap={layout === 'rows' ? '24%' : '16%'}
      >
        <CartesianGrid
          {...(layout === 'rows' ? ROW_GRID_PROPS : chartGridProps)}
        />
        {layout === 'rows' ? (
          <>
            <XAxis
              {...chartAxisProps}
              {...niceAxisProps(valueTicks)}
              tickFormatter={formatCountTick}
            />
            <YAxis {...categoryAxis} width="auto" />
          </>
        ) : (
          <>
            <XAxis {...categoryAxis} />
            <YAxis
              {...chartValueAxisProps}
              {...niceAxisProps(valueTicks)}
              tickFormatter={formatCountTick}
            />
          </>
        )}
        <ChartTooltip
          cursor={CHART_CURSOR.bar}
          content={
            <ChartTooltipContent
              nameFormatter={() => valueName}
              valueFormatter={formatCountTick}
              footer={
                footer
                  ? (payload) => {
                      const bar = payload[0] ? barOf(payload[0]) : undefined;
                      return bar ? footer(bar) : null;
                    }
                  : undefined
              }
            />
          }
        />
        <Bar
          dataKey="count"
          name={valueName}
          fill={ownFills ? undefined : seriesColor(0)}
          radius={layout === 'rows' ? ROW_BAR_RADIUS : CHART_BAR_RADIUS}
          maxBarSize={layout === 'rows' ? 28 : 48}
          isAnimationActive={false}
        >
          {ownFills
            ? data.map((bar) => <Cell key={bar.key} fill={bar.fill} />)
            : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
