'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { Eyebrow } from '@/components/kit/layout/Typography';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatQuarterLong, summarizeActivity } from '@/lib/beatmaps/records';
import { seriesColor } from '@/lib/kit/color/categorical';
import { CHART_CURSOR } from '@/lib/kit/charts/axis';
import { formatCountTick } from '@/lib/kit/charts/format';
import { formatCount, formatCountOf } from '@/lib/kit/format/number';
import type { BeatmapUsagePoint } from '@/lib/orpc/schema/beatmapStats';

const chartConfig: ChartConfig = {
  gameCount: {
    label: 'Verified games',
    color: seriesColor(0),
  },
};

/** Verified games per quarter. */
export default function BeatmapUsageSparkline({
  usage,
}: {
  usage: BeatmapUsagePoint[];
}) {
  const activity = summarizeActivity(usage);

  // Pooled-but-never-played maps have nothing to draw.
  if (usage.length < 2 || activity.maxGames === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>Games per quarter</Eyebrow>
        <span className="text-xs text-muted-foreground tabular-nums">
          {`Peak ${formatCount(activity.maxGames)}`}
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="mt-2 aspect-auto h-20 w-full"
      >
        <BarChart
          data={usage}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={1}
          aria-label="Verified games per quarter"
        >
          <XAxis dataKey="quarter" hide />
          {/* Pinned to the peak; the default domain rounds up past it */}
          <YAxis domain={[0, activity.maxGames]} hide />
          <ChartTooltip
            cursor={CHART_CURSOR.bar}
            content={
              <ChartTooltipContent
                labelFormatter={(label) => formatQuarterLong(String(label))}
                nameFormatter={() => 'Verified games'}
                valueFormatter={formatCountTick}
                footer={(payload) => {
                  const point = payload[0]?.payload as
                    BeatmapUsagePoint | undefined;
                  return point
                    ? formatCountOf(point.pooledCount, 'pool record')
                    : null;
                }}
              />
            }
          />
          <Bar
            dataKey="gameCount"
            name="Verified games"
            fill="var(--color-gameCount)"
            fillOpacity={0.85}
            radius={[2, 2, 0, 0]}
            // A single game must still read; an empty quarter must stay empty.
            minPointSize={(value) => (value ? 2 : 0)}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-1 flex justify-between border-t pt-1 text-xs text-muted-foreground tabular-nums">
        <span>{formatQuarterLong(usage[0].quarter)}</span>
        <span>{formatQuarterLong(usage[usage.length - 1].quarter)}</span>
      </div>
    </div>
  );
}
