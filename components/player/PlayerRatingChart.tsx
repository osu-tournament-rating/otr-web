'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LineChartIcon, Info, Calendar } from 'lucide-react';
import PlayerRatingChartOptions, {
  PlayerRatingChartFilterValues,
} from './PlayerRatingChartOptions';
import SimpleTooltip from '@/components/simple-tooltip';
import {
  RatingAdjustmentDTO,
  RatingAdjustmentType,
} from '@osu-tournament-rating/otr-api-client';
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

interface PlayerRatingChartProps {
  adjustments: RatingAdjustmentDTO[];
  highestRating: number;
}

export default function PlayerRatingChart({
  adjustments,
  highestRating,
}: PlayerRatingChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const [timeRange, setTimeRange] = useState<string>(
    searchParams.get('dateMin') && searchParams.get('dateMax')
      ? 'custom'
      : 'all'
  );
  const [activeTab, setActiveTab] = useState<'rating' | 'volatility'>('rating');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [filterValues, setFilterValues] =
    useState<PlayerRatingChartFilterValues>({
      showDecay: true,
    });

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    searchParams.get('dateMin')
      ? new Date(searchParams.get('dateMin')!)
      : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    searchParams.get('dateMax')
      ? new Date(searchParams.get('dateMax')!)
      : undefined
  );

  const { showDecay } = filterValues;

  const filteredData = useMemo(() => {
    if (!showDecay) {
      return adjustments.filter(
        (point) => point.adjustmentType !== RatingAdjustmentType.Decay
      );
    }
    return adjustments;
  }, [adjustments, showDecay]);

  const dailyData = useMemo(() => {
    const dailyMap = new Map<string, RatingAdjustmentDTO>();

    sortData(filteredData, true).forEach((point) => {
      const dateKey = new Date(point.timestamp).toISOString().split('T')[0];
      dailyMap.set(dateKey, point);
    });

    return Array.from(dailyMap.values());
  }, [filteredData]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);

    const now = new Date();
    const params = new URLSearchParams(searchParams.toString());

    if (value === '1y') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      setDateFrom(oneYearAgo);
      setDateTo(now);

      params.set('dateMin', oneYearAgo.toISOString().split('T')[0]);
      params.set('dateMax', now.toISOString().split('T')[0]);
      router.push(`?${params.toString()}`, { scroll: false });
    } else if (value === '6m') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      setDateFrom(sixMonthsAgo);
      setDateTo(now);

      params.set('dateMin', sixMonthsAgo.toISOString().split('T')[0]);
      params.set('dateMax', now.toISOString().split('T')[0]);
      router.push(`?${params.toString()}`, { scroll: false });
    } else if (value === '3m') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      setDateFrom(threeMonthsAgo);
      setDateTo(now);

      params.set('dateMin', threeMonthsAgo.toISOString().split('T')[0]);
      params.set('dateMax', now.toISOString().split('T')[0]);
      router.push(`?${params.toString()}`, { scroll: false });
    } else if (value === 'all') {
      setDateFrom(undefined);
      setDateTo(undefined);

      params.delete('dateMin');
      params.delete('dateMax');
      router.push(`?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <Card className="p-6 font-sans">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-6 w-6 text-primary" />
          <h3 className="font-sans text-lg font-semibold">Rating History</h3>
          <SimpleTooltip content="Shows your rating changes over time. Each entry represents a rating adjustment from a match or rating decay.">
            <Info className="h-4 w-4 text-muted-foreground" />
          </SimpleTooltip>
        </div>

        <div className="flex gap-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'rating' | 'volatility')}
          >
            <TabsList className="font-sans">
              <TabsTrigger value="rating">Rating</TabsTrigger>
              <TabsTrigger value="volatility">Volatility</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-full font-sans sm:w-[160px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                {dateFrom && dateTo && timeRange === 'custom' && (
                  <SelectItem value="custom">Custom Range</SelectItem>
                )}
              </SelectContent>
            </Select>

            <PlayerRatingChartOptions
              filter={filterValues}
              onFilterChange={setFilterValues}
            />
          </div>
        </div>
      </div>

      <PlayerRatingChartSummaryStats
        data={filteredData}
        highestRating={highestRating}
      />

      <Tabs
        defaultValue="chart"
        onValueChange={(v) => setViewMode(v as 'chart' | 'table')}
      >
        <TabsList className="font-sans">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

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
        <TabsContent value="table">
          <PlayerRatingChartTable data={filteredData} activeTab={activeTab} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
