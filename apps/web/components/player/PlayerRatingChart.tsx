'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LineChartIcon,
  Info,
  Calendar,
  Table as TableIcon,
} from 'lucide-react';
import PlayerRatingChartOptions, {
  PlayerRatingChartFilterValues,
} from './PlayerRatingChartOptions';
import SimpleTooltip from '@/components/simple-tooltip';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '../ui/card';
import { useTheme } from 'next-themes';
import PlayerRatingChartSummaryStats from './PlayerRatingChartSummaryStats';
import { sortData } from '@/lib/utils/playerRatingChart';
import PlayerRatingChartTable from './PlayerRatingChartTable';
import PlayerRatingChartView from './PlayerRatingChartView';
import TierIcon from '../icons/TierIcon';
import TRText from '../rating/TRText';
import { getTierFromRating } from '@/lib/utils/tierData';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';
import { RatingAdjustmentType } from '@otr/core/osu';

type TimeRangeOption = 'all' | '1y' | '6m' | '3m' | 'custom';

const DATE_PRESETS: Record<
  Exclude<TimeRangeOption, 'all' | 'custom'>,
  (endDate: Date) => Date
> = {
  '1y': (endDate) => {
    const start = new Date(endDate);
    start.setFullYear(start.getFullYear() - 1);
    return start;
  },
  '6m': (endDate) => {
    const start = new Date(endDate);
    start.setMonth(start.getMonth() - 6);
    return start;
  },
  '3m': (endDate) => {
    const start = new Date(endDate);
    start.setMonth(start.getMonth() - 3);
    return start;
  },
};

const toDateOnlyIso = (date: Date) => date.toISOString().split('T')[0];

const parseDateParam = (value: string | null): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const deriveTimeRange = (startDate?: Date, endDate?: Date): TimeRangeOption => {
  if (!startDate && !endDate) {
    return 'all';
  }

  if (!startDate || !endDate) {
    return 'custom';
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'custom';
  }

  const endDateIso = toDateOnlyIso(endDate);

  for (const [range, resolver] of Object.entries(DATE_PRESETS)) {
    const expectedStart = resolver(new Date(endDate));
    if (toDateOnlyIso(expectedStart) === toDateOnlyIso(startDate)) {
      return range as TimeRangeOption;
    }
  }

  // If the end date corresponds to today, re-evaluate presets against today's date
  // to account for cases where the stored end date might lag behind the current day.
  const todayIso = toDateOnlyIso(new Date());
  if (endDateIso !== todayIso) {
    for (const [range, resolver] of Object.entries(DATE_PRESETS)) {
      const expectedStart = resolver(new Date());
      if (toDateOnlyIso(expectedStart) === toDateOnlyIso(startDate)) {
        return range as TimeRangeOption;
      }
    }
  }

  return 'custom';
};

interface PlayerRatingChartProps {
  adjustments: PlayerRatingAdjustment[];
  highestRating: number | undefined;
}

export default function PlayerRatingChart({
  adjustments,
  highestRating,
}: PlayerRatingChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const dateMinParam = searchParams.get('dateMin');
  const dateMaxParam = searchParams.get('dateMax');

  const [timeRange, setTimeRange] = useState<TimeRangeOption>(() =>
    deriveTimeRange(parseDateParam(dateMinParam), parseDateParam(dateMaxParam))
  );
  const [activeTab, setActiveTab] = useState<'rating' | 'volatility'>('rating');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [filterValues, setFilterValues] =
    useState<PlayerRatingChartFilterValues>({
      showDecay: true,
    });

  useEffect(() => {
    const derivedRange = deriveTimeRange(
      parseDateParam(dateMinParam),
      parseDateParam(dateMaxParam)
    );

    setTimeRange((prev) => (prev === derivedRange ? prev : derivedRange));
  }, [dateMinParam, dateMaxParam]);

  const { showDecay } = filterValues;

  const filteredData = useMemo(() => {
    return adjustments.filter((point) => {
      if (
        activeTab === 'rating' &&
        point.adjustmentType === RatingAdjustmentType.VolatilityDecay
      ) {
        return false;
      }
      if (!showDecay) {
        return (
          point.adjustmentType !== RatingAdjustmentType.Decay &&
          point.adjustmentType !== RatingAdjustmentType.VolatilityDecay
        );
      }
      return true;
    });
  }, [adjustments, showDecay, activeTab]);

  const dailyData = useMemo(() => {
    const dailyMap = new Map<string, PlayerRatingAdjustment>();

    sortData(filteredData, true).forEach((point) => {
      const dateKey = new Date(point.timestamp).toISOString().split('T')[0];
      dailyMap.set(dateKey, point);
    });

    return Array.from(dailyMap.values());
  }, [filteredData]);

  const handleTimeRangeChange = (value: string) => {
    const nextRange = value as TimeRangeOption;
    setTimeRange(nextRange);

    const now = new Date();
    const params = new URLSearchParams(searchParams.toString());

    if (nextRange === '1y') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      params.set('dateMin', oneYearAgo.toISOString().split('T')[0]);
      params.set('dateMax', now.toISOString().split('T')[0]);
      const query = params.toString();
      router.push(query ? `?${query}` : '?', { scroll: false });
    } else if (nextRange === '6m') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      params.set('dateMin', sixMonthsAgo.toISOString().split('T')[0]);
      params.set('dateMax', now.toISOString().split('T')[0]);
      const query = params.toString();
      router.push(query ? `?${query}` : '?', { scroll: false });
    } else if (nextRange === '3m') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);

      params.set('dateMin', threeMonthsAgo.toISOString().split('T')[0]);
      params.set('dateMax', now.toISOString().split('T')[0]);
      const query = params.toString();
      router.push(query ? `?${query}` : '?', { scroll: false });
    } else if (nextRange === 'all') {
      params.delete('dateMin');
      params.delete('dateMax');
      const query = params.toString();
      router.push(query ? `?${query}` : '?', { scroll: false });
    }
  };

  const { tier: peakTier, subTier: peakSubTier } = getTierFromRating(
    highestRating ?? 0
  );

  return (
    <Card data-testid="player-rating-chart" className="p-6 font-sans">
      {/* One controlled Tabs spans the header (toggle) and the body (panels) */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as 'chart' | 'table')}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-6 w-6 text-primary" />
            <h3 className="font-sans text-lg font-semibold">Rating History</h3>
            <SimpleTooltip content="Shows your rating changes over time. Each entry represents a rating adjustment from a match or rating decay. The dashed line marks the all-time peak rating.">
              <Info className="h-4 w-4 text-muted-foreground" />
            </SimpleTooltip>

            {/* Quiet, always-visible peak chip (issue #722: peak is no longer
                a big card that reads like the current rating) */}
            {highestRating != null && (
              <>
                <span className="h-4 w-px bg-border" />
                <SimpleTooltip
                  side="bottom"
                  content="Highest rating ever reached"
                >
                  <span
                    className="inline-flex cursor-help items-center gap-2 rounded-md bg-popover px-2.5 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    tabIndex={0}
                    aria-label={`Peak rating ${highestRating.toFixed(0)}`}
                  >
                    <TierIcon
                      tier={peakTier}
                      subTier={peakSubTier}
                      width={16}
                      height={16}
                    />
                    <span className="flex items-baseline gap-1">
                      <span className="text-sm font-semibold text-foreground">
                        {highestRating.toFixed(0)}
                      </span>
                      <TRText />
                      <span className="text-xs text-muted-foreground">
                        peak
                      </span>
                    </span>
                  </span>
                </SimpleTooltip>
              </>
            )}
          </div>

          {/* Header control cluster: Chart/Table, time range, then Options
              stay on a single row in that order at every width (issue #722) */}
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <TabsList data-testid="rating-chart-toggle" className="font-sans">
              <TabsTrigger value="chart">
                <LineChartIcon className="mr-1.5 h-4 w-4" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="table">
                <TableIcon className="mr-1.5 h-4 w-4" />
                Table
              </TabsTrigger>
            </TabsList>

            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="flex-1 font-sans sm:w-[160px] sm:flex-none">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                {timeRange === 'custom' && (
                  <SelectItem value="custom">Custom Range</SelectItem>
                )}
              </SelectContent>
            </Select>

            <span className="hidden h-5 w-px bg-border sm:block" />

            <PlayerRatingChartOptions
              filter={filterValues}
              onFilterChange={setFilterValues}
            />
          </div>
        </div>

        {/* Rating/Volatility series toggle (demoted from the header) paired
            with the compact Total Change so the row carries no dead space */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'rating' | 'volatility')}
          >
            <TabsList className="font-sans">
              <TabsTrigger value="rating">Rating</TabsTrigger>
              <TabsTrigger value="volatility">Volatility</TabsTrigger>
            </TabsList>
          </Tabs>

          <PlayerRatingChartSummaryStats
            data={filteredData}
            rangeLabel={timeRange === 'all' ? undefined : 'in range'}
          />
        </div>

        <TabsContent value="chart">
          <PlayerRatingChartView
            data={
              viewMode === 'chart' && activeTab === 'rating'
                ? filteredData
                : dailyData
            }
            activeTab={activeTab}
            highestRating={highestRating}
            theme={theme}
          />
        </TabsContent>
        <TabsContent value="table" className="max-h-[300px] overflow-y-scroll">
          <PlayerRatingChartTable data={filteredData} activeTab={activeTab} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
