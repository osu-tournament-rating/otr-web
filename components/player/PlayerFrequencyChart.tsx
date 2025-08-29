'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart, XAxis, YAxis, Bar } from 'recharts';
import { PlayerFrequencyDTO } from '@osu-tournament-rating/otr-api-client';
import { ChartConfig, ChartContainer, ChartTooltip } from '../ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import Image from 'next/image';

// Constants for chart configuration
const CHART_CONSTANTS = {
  DESKTOP_DISPLAY_LIMIT: 10,
  MOBILE_DISPLAY_LIMIT: 7,
  AVATAR_SIZE: {
    TICK: 32,
    TOOLTIP: 40,
  },
  CHART_MARGIN: {
    top: 20,
    right: 0,
    left: -30,
    bottom: 0,
  },
  BAR_SIZE: 30,
  BAR_RADIUS: [4, 4, 0, 0] as [number, number, number, number],
  X_AXIS_HEIGHT: 50,
  DEFAULT_AVATAR_URL: 'https://a.ppy.sh',
} as const;

interface ChartDataEntry {
  username: string;
  frequency: number;
  osuId: number;
  avatarUrl: string;
}

type ChartType = 'teammates' | 'opponents';

interface PlayerFrequencyChartProps {
  className?: string;
  data: PlayerFrequencyDTO[];
  type: ChartType;
  title?: string;
  description?: string;
  emptyMessage?: string;
  chartColor?: string;
}

// Type guard for PlayerFrequencyDTO
function isValidPlayerFrequency(item: unknown): item is PlayerFrequencyDTO {
  return (
    item !== null &&
    typeof item === 'object' &&
    'player' in item &&
    'frequency' in item &&
    typeof (item as { player: unknown }).player === 'object' &&
    (item as { player: unknown }).player !== null &&
    'username' in (item as { player: object }).player &&
    'osuId' in (item as { player: object }).player
  );
}

// Type guard for ChartDataEntry
function isChartDataEntry(data: unknown): data is ChartDataEntry {
  return (
    data !== null &&
    typeof data === 'object' &&
    'username' in data &&
    'frequency' in data &&
    'osuId' in data &&
    'avatarUrl' in data
  );
}

export default function PlayerFrequencyChart({
  className,
  data,
  type,
  title,
  description,
  emptyMessage,
  chartColor,
}: PlayerFrequencyChartProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [transparentAvatars, setTransparentAvatars] = useState<Set<number>>(
    new Set()
  );

  // Default values based on type
  const defaultTitle =
    type === 'teammates' ? 'Frequent Teammates' : 'Frequent Opponents';
  const defaultDescription =
    type === 'teammates'
      ? 'Most frequently played with teammates'
      : 'Most frequently played against opponents';
  const defaultEmptyMessage =
    type === 'teammates'
      ? 'No teammate data available'
      : 'No opponent data available';
  const defaultChartColor =
    type === 'teammates' ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))';

  const chartConfig: ChartConfig = {
    frequency: {
      label: 'Games',
      color: chartColor || defaultChartColor,
    },
  };

  // Process frequency data with error handling
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { desktop: [], mobile: [] };
    }

    try {
      const processedData = data
        .filter(isValidPlayerFrequency)
        .map((item) => ({
          username: item.player.username,
          frequency: item.frequency,
          osuId: item.player.osuId,
          avatarUrl: `${CHART_CONSTANTS.DEFAULT_AVATAR_URL}/${item.player.osuId}`,
        }))
        .sort((a, b) => b.frequency - a.frequency);

      return {
        desktop: processedData.slice(0, CHART_CONSTANTS.DESKTOP_DISPLAY_LIMIT),
        mobile: processedData.slice(0, CHART_CONSTANTS.MOBILE_DISPLAY_LIMIT),
      };
    } catch (error) {
      console.error('Error processing chart data:', error);
      return { desktop: [], mobile: [] };
    }
  }, [data]);

  // Handle image loading errors
  const handleImageError = useCallback((osuId: number) => {
    setImageErrors((prev) => new Set(prev).add(osuId));
  }, []);

  // Handle transparent avatar detection
  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>, osuId: number) => {
      const img = event.currentTarget;

      // Create a canvas to check if image is transparent
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // Sample multiple points to check for transparency
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let isTransparent = true;

      // Check if the image has any non-transparent pixels
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 10) {
          // Alpha channel threshold
          isTransparent = false;
          break;
        }
      }

      if (isTransparent) {
        setTransparentAvatars((prev) => new Set(prev).add(osuId));
      }
    },
    []
  );

  // Memoized function to create custom X axis tick with accessibility improvements
  const createCustomXAxisTick = useCallback(
    (tickData: ChartDataEntry[]) => {
      const TickComponent = (props: {
        x?: number;
        y?: number;
        payload?: { value: string };
      }) => {
        const { x, y, payload } = props;

        if (!payload?.value || x === undefined || y === undefined) {
          return <g />;
        }

        const player = tickData.find((p) => p.username === payload.value);

        if (!player || !isChartDataEntry(player)) {
          return <g />;
        }

        const hasImageError = imageErrors.has(player.osuId);
        const isTransparent = transparentAvatars.has(player.osuId);
        const shouldUseFallback = hasImageError || isTransparent;
        const avatarSize = CHART_CONSTANTS.AVATAR_SIZE.TICK;

        return (
          <g transform={`translate(${x},${y})`}>
            <foreignObject
              x={-avatarSize / 2}
              y={5}
              width={avatarSize}
              height={avatarSize}
            >
              <button
                type="button"
                onClick={() => {
                  const ruleset = searchParams.get('ruleset');
                  const url = ruleset
                    ? `/players/${player.osuId}?ruleset=${ruleset}`
                    : `/players/${player.osuId}`;
                  router.push(url);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const ruleset = searchParams.get('ruleset');
                    const url = ruleset
                      ? `/players/${player.osuId}?ruleset=${ruleset}`
                      : `/players/${player.osuId}`;
                    router.push(url);
                  }
                }}
                className="cursor-pointer rounded-full outline-none focus:outline-none"
                aria-label={`View ${player.username}'s profile`}
                title={player.username}
              >
                {shouldUseFallback ? (
                  <div
                    className="rounded-full bg-accent"
                    style={{ width: avatarSize, height: avatarSize }}
                    aria-label={`${player.username} avatar`}
                  />
                ) : (
                  <Image
                    src={player.avatarUrl}
                    alt={`${player.username} avatar`}
                    width={avatarSize}
                    height={avatarSize}
                    className="rounded-full"
                    style={{ imageRendering: 'crisp-edges' }}
                    onLoad={(e) => handleImageLoad(e, player.osuId)}
                    onError={() => handleImageError(player.osuId)}
                  />
                )}
              </button>
            </foreignObject>
          </g>
        );
      };
      TickComponent.displayName = 'CustomXAxisTick';
      return TickComponent;
    },
    [
      router,
      searchParams,
      imageErrors,
      transparentAvatars,
      handleImageError,
      handleImageLoad,
    ]
  );

  // Custom tooltip component with error handling
  const CustomTooltip = useCallback(
    ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: Array<{ payload: unknown }>;
    }) => {
      if (!active || !payload?.length) return null;

      const data = payload[0].payload;

      if (!isChartDataEntry(data)) {
        return null;
      }

      const hasImageError = imageErrors.has(data.osuId);
      const isTransparent = transparentAvatars.has(data.osuId);
      const shouldUseFallback = hasImageError || isTransparent;
      const avatarSize = CHART_CONSTANTS.AVATAR_SIZE.TOOLTIP;

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <div className="flex items-center gap-3">
            {shouldUseFallback ? (
              <div
                className="rounded-full bg-accent"
                style={{ width: avatarSize, height: avatarSize }}
                aria-label={`${data.username} avatar`}
              />
            ) : (
              <Image
                src={data.avatarUrl}
                alt={`${data.username} avatar`}
                width={avatarSize}
                height={avatarSize}
                className="rounded-full"
                style={{ imageRendering: 'crisp-edges' }}
                onLoad={(e) => handleImageLoad(e, data.osuId)}
                onError={() => handleImageError(data.osuId)}
              />
            )}
            <div>
              <p className="font-semibold">{data.username}</p>
              <p className="text-sm text-muted-foreground">
                Matches played: {data.frequency}
              </p>
            </div>
          </div>
        </div>
      );
    },
    [imageErrors, transparentAvatars, handleImageError, handleImageLoad]
  );

  if (chartData.desktop.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="items-center">
          <CardTitle>{title || defaultTitle}</CardTitle>
          <CardDescription>
            {emptyMessage || defaultEmptyMessage}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle>{title || defaultTitle}</CardTitle>
        <CardDescription>{description || defaultDescription}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden pb-0 font-sans">
        {/* Desktop version */}
        <div className="hidden md:block">
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart
              data={chartData.desktop}
              margin={CHART_CONSTANTS.CHART_MARGIN}
            >
              <XAxis
                dataKey="username"
                tick={createCustomXAxisTick(chartData.desktop)}
                interval={0}
                height={CHART_CONSTANTS.X_AXIS_HEIGHT}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, 'dataMax']}
                tickFormatter={(value: number) => value.toString()}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="frequency"
                fill={chartColor || defaultChartColor}
                radius={CHART_CONSTANTS.BAR_RADIUS}
                barSize={CHART_CONSTANTS.BAR_SIZE}
              />
            </BarChart>
          </ChartContainer>
        </div>
        {/* Mobile version */}
        <div className="block md:hidden">
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart
              data={chartData.mobile}
              margin={CHART_CONSTANTS.CHART_MARGIN}
            >
              <XAxis
                dataKey="username"
                tick={createCustomXAxisTick(chartData.mobile)}
                interval={0}
                height={CHART_CONSTANTS.X_AXIS_HEIGHT}
              />
              <YAxis
                allowDecimals={false}
                domain={[0, 'dataMax']}
                tickFormatter={(value: number) => value.toString()}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="frequency"
                fill={chartColor || defaultChartColor}
                radius={CHART_CONSTANTS.BAR_RADIUS}
                barSize={CHART_CONSTANTS.BAR_SIZE}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
