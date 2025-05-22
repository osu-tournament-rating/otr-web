'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Info,
  LineChartIcon,
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
  DotProps,
  Legend,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '../ui/card';
import { useTheme } from 'next-themes';
import TRText from '../rating/TRText';
import PlayerRatingChartTooltip from './PlayerRatingChartTooltip';
import { RatingAdjustmentTypeEnumhelper } from '@/lib/enums';
import { formattedDate } from './PlayerRatingChartTooltip';
import { capitalize } from '@/lib/utils';

export type ChartDataPoint = {
  formattedAxisDate: string;
} & RatingAdjustmentDTO;

interface PlayerRatingChartProps {
  adjustments: RatingAdjustmentDTO[];
  highestRating: number;
}

interface ChartColors {
  rating: string;
  volatility: string;
  grid: string;
  text: string;
  background: string;
}

interface SummaryStatsProps {
  data: RatingAdjustmentDTO[];
  highestRating: number;
}

interface ChartViewProps {
  data: RatingAdjustmentDTO[];
  activeTab: 'rating' | 'volatility';
  highestRating: number;
  theme?: string;
}

interface TableViewProps {
  data: RatingAdjustmentDTO[];
  activeTab: 'rating' | 'volatility';
}

function sortData(
  data: RatingAdjustmentDTO[],
  descending: boolean
): RatingAdjustmentDTO[] {
  return [...data].sort((a, b) =>
    descending
      ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function getChartColors(theme?: string): ChartColors {
  return {
    rating: '#3b82f6', // blue-500
    volatility: '#8b5cf6', // violet-500
    grid: theme === 'dark' ? '#374151' : '#e5e7eb', // gray-700 : gray-200
    text: theme === 'dark' ? '#d1d5db' : '#4b5563', // gray-300 : gray-600
    background: theme === 'dark' ? '#1f2937' : '#f9fafb', // gray-800 : gray-50
  };
}

function getAdjustmentTypeColor(
  type: RatingAdjustmentType,
  delta: number
): string {
  switch (type) {
    case RatingAdjustmentType.Decay:
      return 'bg-gray-500';
    case RatingAdjustmentType.Match:
      return delta > 0 ? 'bg-green-500' : 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
}

function SummaryStats({ data, highestRating }: SummaryStatsProps) {
  if (data.length === 0) return null;

  const sortedData = sortData(data, false);
  const currentRating = sortedData[sortedData.length - 1]?.ratingAfter || 0;
  const initialRating = sortedData[0]?.ratingAfter || 0;
  const totalChange = currentRating - initialRating;

  return (
    <div className="flex flex-wrap gap-2">
      <Card className="flex-1 flex-row items-center gap-2 rounded-xl p-4">
        <Award className="h-6 w-6 text-primary" />
        <div>
          <div className="text-sm text-muted-foreground">Peak Rating</div>
          <div className="text-xl font-semibold">
            {highestRating.toFixed(0)} <TRText className="-ml-1" />
          </div>
        </div>
      </Card>
      <Card className="flex-1 flex-row items-center gap-2 rounded-xl p-4">
        {totalChange >= 0 ? (
          <TrendingUp className="h-6 w-6 text-primary" />
        ) : (
          <TrendingDown className="h-6 w-6 text-primary" />
        )}
        <div>
          <div className="text-sm text-muted-foreground">Total Change</div>
          <div
            className={`flex flex-row items-baseline gap-1 text-xl font-semibold ${totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {totalChange > 0 ? '+' : ''}
            {totalChange.toFixed(0)}
            <TRText />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChartView({ data, activeTab, highestRating, theme }: ChartViewProps) {
  if (!data || !data.length) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        No data available
      </div>
    );
  }

  const chartColors = getChartColors(theme);

  // Prepare data for recharts
  const chartData: ChartDataPoint[] = sortData(data, false).map(
    (adjustment) => ({
      ...adjustment,
      // Format date for x-axis
      formattedAxisDate: format(adjustment.timestamp, "MMM ''yy"),
    })
  );

  const renderActiveDot = (props: DotProps) => {
    if (props === undefined) {
      return <circle cx={0} cy={0} r={0} fill="transparent" opacity={0} />;
    }

    // TODO: payload is in props, fix error
    const { cx, cy, payload } = props;

    // For non-match adjustments, render an invisible dot (opacity 0)
    if (
      payload.adjustmentType !== RatingAdjustmentType.Match ||
      !payload.match?.id
    ) {
      return <circle cx={cx} cy={cy} r={0} fill="transparent" opacity={0} />;
    }

    // For match adjustments, show a clickable dot
    return (
      <Link href={`/matches/${payload.match?.id}`}>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={
            activeTab === 'rating' ? chartColors.rating : chartColors.volatility
          }
          stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
        />
      </Link>
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
          <RechartsTooltip
            content={<PlayerRatingChartTooltip activeTab={activeTab} />}
          />
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
            dataKey={`${activeTab}After`}
            stroke={
              activeTab === 'rating'
                ? chartColors.rating
                : chartColors.volatility
            }
            strokeWidth={2}
            name={capitalize(activeTab)}
            dot={false}
            activeDot={renderActiveDot}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableView({ data, activeTab }: TableViewProps) {
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
            {sortData(data, true).map((point, index) => (
              <tr key={index} className="border-b font-sans hover:bg-muted">
                <td className="p-2">{formattedDate(point.timestamp)}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${getAdjustmentTypeColor(point.adjustmentType, point.ratingDelta)}`}
                    />
                    {
                      RatingAdjustmentTypeEnumhelper.getMetadata(
                        point.adjustmentType
                      ).text
                    }
                  </div>
                </td>
                <td className="p-2 text-right font-medium">
                  {activeTab === 'rating'
                    ? point.ratingAfter.toFixed(0)
                    : point.volatilityAfter.toFixed(2)}
                </td>
                {activeTab === 'rating' ? (
                  // Rating 'Change' data (table)
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
                ) : (
                  // Volatility 'Change' data (table)
                  <td
                    className={`p-2 text-right font-medium ${
                      point.volatilityDelta < 0
                        ? 'text-green-500'
                        : point.volatilityDelta > 0
                          ? 'text-red-500'
                          : ''
                    }`}
                  >
                    {point.volatilityDelta > 0 ? '+' : ''}
                    {point.volatilityDelta.toFixed(2)}
                  </td>
                )}

                <td className="max-w-[200px] truncate p-2 text-muted-foreground">
                  {point.match?.id && point.match?.name ? (
                    <Link
                      href={`/matches/${point.match.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {point.match.name}
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

  // Filter data based on user preferences
  const filteredData = useMemo(() => {
    if (!showDecay) {
      return adjustments.filter(
        (point) => point.adjustmentType !== RatingAdjustmentType.Decay
      );
    }
    return adjustments;
  }, [adjustments, showDecay]);

  // Compute daily data for volatility chart
  const dailyData = useMemo(() => {
    const dailyMap = new Map<string, RatingAdjustmentDTO>();

    sortData(filteredData, true).forEach((point) => {
      const dateKey = format(point.timestamp, 'yyyy-MM-dd');
      dailyMap.set(dateKey, point);
    });

    return Array.from(dailyMap.values());
  }, [filteredData]);

  const handleTimeRangeChange = (value: string) => {
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

      <SummaryStats data={filteredData} highestRating={highestRating} />

      <Tabs
        defaultValue="chart"
        onValueChange={(v) => setViewMode(v as 'chart' | 'table')}
      >
        <TabsList className="font-sans">
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <ChartView
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
          <TableView data={filteredData} activeTab={activeTab} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
