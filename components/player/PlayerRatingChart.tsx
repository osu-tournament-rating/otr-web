'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Info,
  LineChart as LineChartIcon,
  BarChart4,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
} from 'lucide-react';
import PlayerRatingChartOptions, {
  PlayerRatingChartFilterValues,
} from './PlayerRatingChartOptions';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Dot,
} from 'recharts';

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
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '../ui/card';
import { useTheme } from 'next-themes';
import TRText from '../rating/TRText';

const ADJUSTMENT_TYPE_NAMES: Record<RatingAdjustmentType, string> = {
  [RatingAdjustmentType.Initial]: 'Initial Rating',
  [RatingAdjustmentType.Decay]: 'Decay',
  [RatingAdjustmentType.Match]: 'Match',
};

interface ChartDataPoint {
  date: Date;
  rating: number;
  adjustmentType: RatingAdjustmentType;
  ratingDelta: number;
  matchName?: string;
  matchId?: number;
  formattedDate: string;
  volatility: number;
}

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

  // Date range state
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
  const { theme } = useTheme();

  // Update URL when date range changes and trigger a refetch
  const updateDateRange = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (dateFrom) {
      params.set('dateMin', dateFrom.toISOString().split('T')[0]);
    } else {
      params.delete('dateMin');
    }

    if (dateTo) {
      params.set('dateMax', dateTo.toISOString().split('T')[0]);
    } else {
      params.delete('dateMax');
    }

    // Use { scroll: false } to prevent page jumping
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const chartData = useMemo<ChartDataPoint[]>(() => {
    return adjustments.map((adj) => ({
      date: new Date(adj.timestamp),
      rating: adj.ratingAfter,
      adjustmentType: adj.adjustmentType,
      ratingDelta: adj.ratingDelta,
      matchName: adj.match?.name,
      matchId: adj.match?.id,
      formattedDate: format(new Date(adj.timestamp), 'MMM d, yyyy'),
      volatility: adj.volatilityAfter,
    }));
  }, [adjustments]);

  // Filter out decay if not showing - this is the only client-side filtering we'll keep
  const filteredData = useMemo(() => {
    if (!showDecay) {
      return chartData.filter(
        (point) => point.adjustmentType !== RatingAdjustmentType.Decay
      );
    }
    return chartData;
  }, [chartData, showDecay]);

  // Compute daily data for volatility chart
  const dailyData = useMemo(() => {
    const dailyMap = new Map<string, ChartDataPoint>();

    const sortedData = [...filteredData].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    sortedData.forEach((point) => {
      const dateKey = format(point.date, 'yyyy-MM-dd');
      dailyMap.set(dateKey, point);
    });

    return Array.from(dailyMap.values());
  }, [filteredData]);

  const getAdjustmentTypeColor = (
    type: RatingAdjustmentType,
    delta: number
  ) => {
    switch (type) {
      case RatingAdjustmentType.Decay:
        return 'bg-gray-500';
      case RatingAdjustmentType.Match:
        return delta > 0 ? 'bg-green-500' : 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getChartColors = () => {
    return {
      rating: '#3b82f6', // blue-500
      volatility: '#8b5cf6', // violet-500
      grid: theme === 'dark' ? '#374151' : '#e5e7eb', // gray-700 : gray-200
      text: theme === 'dark' ? '#d1d5db' : '#4b5563', // gray-300 : gray-600
      background: theme === 'dark' ? '#1f2937' : '#f9fafb', // gray-800 : gray-50
    };
  };

  const chartColors = getChartColors();

  const renderDataTable = (data: ChartDataPoint[]) => {
    const sortedData = [...data].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    return (
      <div className="h-[350px] overflow-auto">
        <div className="min-w-[600px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b font-sans">
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-right">
                  {activeTab === 'rating' ? 'Rating' : 'Volatility'}
                </th>
                <th className="p-2 text-right">Change</th>
                <th className="p-2 text-left">Match</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((point, index) => (
                <tr
                  key={index}
                  className="border-b font-sans hover:bg-muted/50"
                >
                  <td className="p-2">{point.formattedDate}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${getAdjustmentTypeColor(point.adjustmentType, point.ratingDelta)}`}
                      />
                      {ADJUSTMENT_TYPE_NAMES[point.adjustmentType]}
                    </div>
                  </td>
                  <td className="p-2 text-right font-medium">
                    {activeTab === 'rating'
                      ? point.rating.toFixed(0)
                      : point.volatility.toFixed(2)}
                  </td>
                  <td
                    className={`p-2 text-right font-medium ${
                      point.ratingDelta > 0
                        ? 'text-green-500'
                        : point.ratingDelta < 0
                          ? 'text-red-500'
                          : ''
                    }`}
                  >
                    {point.ratingDelta > 0 ? '+' : ''}
                    {point.ratingDelta.toFixed(2)}
                  </td>
                  <td className="max-w-[200px] truncate p-2 text-muted-foreground">
                    {point.matchId && point.matchName ? (
                      <Link
                        href={`/matches/${point.matchId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {point.matchName}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChart = (data: ChartDataPoint[]) => {
    if (data.length === 0)
      return (
        <div className="flex h-[350px] items-center justify-center">
          No data available
        </div>
      );

    const sortedData = [...data].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Prepare data for recharts
    const chartData = sortedData.map((point) => ({
      ...point,
      timestamp: point.date.getTime(),
      // Format date for x-axis
      formattedAxisDate: format(point.date, 'MMM d'),
    }));

    // We're not using custom dots anymore as we're showing a smooth line

    // Custom tooltip component with proper typing
    const CustomTooltip = ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: Array<{ payload: ChartDataPoint }>;
    }) => {
      if (!active || !payload || !payload.length) return null;

      const data = payload[0].payload;

      return (
        <div className="rounded-md border bg-background p-3 font-sans shadow-md">
          <p className="mb-1 font-medium">{data.formattedDate}</p>
          <p className="text-sm text-muted-foreground">
            Type: {ADJUSTMENT_TYPE_NAMES[data.adjustmentType]}
          </p>
          <p className="text-sm">
            {activeTab === 'rating' ? 'Rating: ' : 'Volatility: '}
            <span className="font-medium">
              {activeTab === 'rating'
                ? data.rating.toFixed(0)
                : data.volatility.toFixed(2)}
            </span>
          </p>
          {data.ratingDelta !== 0 && (
            <p className="text-sm">
              Change:
              <span
                className={`ml-1 font-medium ${
                  data.ratingDelta > 0
                    ? 'text-green-500'
                    : data.ratingDelta < 0
                      ? 'text-red-500'
                      : ''
                }`}
              >
                {data.ratingDelta > 0 ? '+' : ''}
                {data.ratingDelta.toFixed(2)}
                <TRText />
              </span>
            </p>
          )}
          {data.matchName && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.matchName}
            </p>
          )}
        </div>
      );
    };

    return (
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={300}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis
              dataKey="formattedAxisDate"
              stroke={chartColors.text}
              tick={{ fill: chartColors.text }}
              tickLine={{ stroke: chartColors.grid }}
              minTickGap={50}
              fontFamily="sans-serif"
            />
            <YAxis
              stroke={chartColors.text}
              tick={{ fill: chartColors.text }}
              tickLine={{ stroke: chartColors.grid }}
              domain={
                activeTab === 'rating'
                  ? ['auto', 'auto']
                  : [
                      (dataMin: number) => Math.max(0, dataMin - 25),
                      'auto' as const,
                    ]
              }
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            {activeTab === 'rating' && (
              <ReferenceLine
                y={highestRating}
                label={{
                  value: 'Peak',
                  position: 'insideTopLeft',
                  fill: chartColors.text,
                }}
                stroke="#8884d8"
                strokeDasharray="3 3"
              />
            )}
            <Line
              type="natural"
              dataKey={activeTab}
              stroke={
                activeTab === 'rating'
                  ? chartColors.rating
                  : chartColors.volatility
              }
              strokeWidth={2}
              dot={false}
              activeDot={(props: any) => {
                if (props === undefined) {
                  return (
                    <circle
                      cx={0}
                      cy={0}
                      r={0}
                      fill="transparent"
                      opacity={0}
                    />
                  );
                }

                // Define proper types for the activeDot props
                const { cx, cy, payload } = props;

                // For non-match adjustments, render an invisible dot (opacity 0)
                // This ensures we always return a ReactElement and not null
                if (
                  payload.adjustmentType !== RatingAdjustmentType.Match ||
                  !payload.matchId
                ) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={0}
                      fill="transparent"
                      opacity={0}
                    />
                  );
                }

                // For match adjustments, show a clickable dot
                return (
                  <Link href={`/matches/${payload.matchId}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={
                        activeTab === 'rating'
                          ? chartColors.rating
                          : chartColors.volatility
                      }
                      stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                    />
                  </Link>
                );
              }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderSummaryStats = (data: ChartDataPoint[]) => {
    if (data.length === 0) return null;

    const currentRating = data[data.length - 1]?.rating || 0;
    const initialRating = data[0]?.rating || 0;
    const totalChange = currentRating - initialRating;

    const matchAdjustments = data.filter(
      (d) => d.adjustmentType === RatingAdjustmentType.Match
    );
    const wins = matchAdjustments.filter((d) => d.ratingDelta > 0).length;
    const losses = matchAdjustments.filter((d) => d.ratingDelta < 0).length;

    return (
      <div className="flex flex-wrap gap-3 font-sans">
        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-lg bg-muted/50 p-4">
          <Award className="h-6 w-6 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Peak Rating</div>
            <div className="text-xl font-semibold">
              {highestRating.toFixed(0)} <TRText className="-ml-1" />
            </div>
          </div>
        </div>
        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-lg bg-muted/50 p-4">
          {totalChange >= 0 ? (
            <TrendingUp className="h-6 w-6 text-primary" />
          ) : (
            <TrendingDown className="h-6 w-6 text-primary" />
          )}
          <div>
            <div className="text-sm text-muted-foreground">Total Change</div>
            <div
              className={`text-xl font-semibold ${totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {totalChange > 0 ? '+' : ''}
              {totalChange.toFixed(0)}
              <TRText />
            </div>
          </div>
        </div>
        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-lg bg-muted/50 p-4">
          <BarChart4 className="h-6 w-6 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">Win/Loss</div>
            <div className="text-xl font-semibold">
              <span className="text-green-500">{wins}</span>
              <span className="mx-1">/</span>
              <span className="text-red-500">{losses}</span>
            </div>
          </div>
        </div>
      </div>
    );
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

        <div className="flex flex-wrap gap-2">
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
            {/* Date Range Picker */}
            <div className="flex gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 font-sans">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PP') : 'From Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex items-center justify-between border-b p-3">
                    <select
                      className="mr-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={
                        dateFrom ? dateFrom.getMonth() : new Date().getMonth()
                      }
                      onChange={(e) => {
                        const newDate = new Date(dateFrom || new Date());
                        newDate.setMonth(parseInt(e.target.value));
                        setDateFrom(newDate);
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {new Date(0, i).toLocaleString('default', {
                            month: 'long',
                          })}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={
                        dateFrom
                          ? dateFrom.getFullYear()
                          : new Date().getFullYear()
                      }
                      onChange={(e) => {
                        const newDate = new Date(dateFrom || new Date());
                        newDate.setFullYear(parseInt(e.target.value));
                        setDateFrom(newDate);
                      }}
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option
                          key={i}
                          value={new Date().getFullYear() - 9 + i}
                        >
                          {new Date().getFullYear() - 9 + i}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      if (date && dateTo && date > dateTo) {
                        setDateTo(date);
                      }
                    }}
                    initialFocus
                    month={dateFrom || undefined}
                  />
                  <div className="flex justify-end gap-2 border-t p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setTimeRange('custom');
                        updateDateRange();
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-10 font-sans">
                    {dateTo ? format(dateTo, 'PP') : 'To Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex items-center justify-between border-b p-3">
                    <select
                      className="mr-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={dateTo ? dateTo.getMonth() : new Date().getMonth()}
                      onChange={(e) => {
                        const newDate = new Date(dateTo || new Date());
                        newDate.setMonth(parseInt(e.target.value));
                        setDateTo(newDate);
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {new Date(0, i).toLocaleString('default', {
                            month: 'long',
                          })}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={
                        dateTo ? dateTo.getFullYear() : new Date().getFullYear()
                      }
                      onChange={(e) => {
                        const newDate = new Date(dateTo || new Date());
                        newDate.setFullYear(parseInt(e.target.value));
                        setDateTo(newDate);
                      }}
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option
                          key={i}
                          value={new Date().getFullYear() - 9 + i}
                        >
                          {new Date().getFullYear() - 9 + i}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      if (date && dateFrom && date < dateFrom) {
                        setDateFrom(date);
                      }
                    }}
                    initialFocus
                    disabled={(date) => (dateFrom ? date < dateFrom : false)}
                    month={dateTo || undefined}
                  />
                  <div className="flex justify-end gap-2 border-t p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateTo(undefined);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setTimeRange('custom');
                        updateDateRange();
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Select
              value={timeRange}
              onValueChange={(value) => {
                setTimeRange(value);

                // Set date range based on selected time range
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

                  params.set(
                    'dateMin',
                    sixMonthsAgo.toISOString().split('T')[0]
                  );
                  params.set('dateMax', now.toISOString().split('T')[0]);
                  router.push(`?${params.toString()}`, { scroll: false });
                } else if (value === '3m') {
                  const threeMonthsAgo = new Date();
                  threeMonthsAgo.setMonth(now.getMonth() - 3);
                  setDateFrom(threeMonthsAgo);
                  setDateTo(now);

                  params.set(
                    'dateMin',
                    threeMonthsAgo.toISOString().split('T')[0]
                  );
                  params.set('dateMax', now.toISOString().split('T')[0]);
                  router.push(`?${params.toString()}`, { scroll: false });
                } else if (value === 'all') {
                  setDateFrom(undefined);
                  setDateTo(undefined);

                  params.delete('dateMin');
                  params.delete('dateMax');
                  router.push(`?${params.toString()}`, { scroll: false });
                }
              }}
            >
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

      {renderSummaryStats(filteredData)}

        <Tabs
          defaultValue="chart"
          onValueChange={(v) => setViewMode(v as 'chart' | 'table')}
        >
          <TabsList className="font-sans">
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            {renderChart(
              viewMode === 'chart' && activeTab === 'rating'
                ? filteredData
                : dailyData
            )}
          </TabsContent>

          <TabsContent value="table">
            {renderDataTable(filteredData)}
          </TabsContent>
        </Tabs>
    </Card>
  );
}
