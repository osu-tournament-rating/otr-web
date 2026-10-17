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
  CHART_ROW_BAR_RADIUS,
  CHART_ROW_MARGIN,
  chartAxisProps,
  chartGridProps,
  chartRowGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import {
  type CountBarDatum,
  type CountBarLayout,
  getCountAxisTicks,
  hasOwnFills,
} from '@/lib/kit/charts/count-bars';
import { formatCountTick } from '@/lib/kit/charts/format';
import { seriesColor } from '@/lib/kit/color/categorical';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

export type { CountBarDatum, CountBarLayout };

function barOf(item: ChartTooltipPayloadItem): CountBarDatum | undefined {
  return item.payload as CountBarDatum | undefined;
}

/**
 * A count per category, such as tournaments per year, per ruleset or per
 * lobby size, on the kit's chart parts. `columns` stand on a category axis
 * along the bottom; `rows` put the categories on the left, for long names.
 * One series in slot 1 of the categorical palette, unless the bars bring
 * their own `fill` (the verification colours). Put it in a Panel under a
 * SectionHeader that names what is counted.
 */
export function CountBarChart({
  data,
  layout = 'columns',
  valueName,
  categoryTicks,
  footer,
  className,
}: {
  data: readonly CountBarDatum[];
  layout?: CountBarLayout;
  /** What is counted, for the tooltip row: "Tournaments". */
  valueName: string;
  /**
   * The category labels to tick, when not every label fits (years). From
   * `getCategoryTicks` with `formatYearTick`. Every label shows without it.
   */
  categoryTicks?: readonly string[];
  /** A tooltip footer for the hovered bar, such as its share of the total. */
  footer?: (bar: CountBarDatum) => React.ReactNode;
  /** Classes for the chart box; 240px tall (`h-60`) unless you change it. */
  className?: string;
}) {
  const isNarrow = useIsNarrowChart();
  const rows = layout === 'rows';
  const valueTicks = getCountAxisTicks(data, { layout, narrow: isNarrow });
  const ownFills = hasOwnFills(data);

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
        layout={rows ? 'vertical' : 'horizontal'}
        margin={rows ? CHART_ROW_MARGIN : CHART_MARGIN}
        barCategoryGap={rows ? '24%' : '16%'}
      >
        <CartesianGrid {...(rows ? chartRowGridProps : chartGridProps)} />
        {rows ? (
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
          radius={rows ? CHART_ROW_BAR_RADIUS : CHART_BAR_RADIUS}
          maxBarSize={rows ? 28 : 48}
          isAnimationActive={false}
        >
          {ownFills
            ? data.map((bar) => (
                <Cell key={bar.key} fill={bar.fill ?? seriesColor(0)} />
              ))
            : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
