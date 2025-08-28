'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

interface ChartDataEntry {
  username: string;
  frequency: number;
  osuId: number;
  avatarUrl: string;
}

interface PlayerOpponentsChartProps {
  className?: string;
  opponents: PlayerFrequencyDTO[];
}

export default function PlayerOpponentsChart({
  className,
  opponents,
}: PlayerOpponentsChartProps) {
  const router = useRouter();

  const chartConfig: ChartConfig = {
    frequency: {
      label: 'Games',
      color: 'hsl(var(--chart-2))',
    },
  };

  // Process opponents data
  const chartData = useMemo(() => {
    if (!opponents || opponents.length === 0) {
      return { desktop: [], mobile: [] };
    }

    const processedData = opponents
      .map((opponent) => ({
        username: opponent.player.username,
        frequency: opponent.frequency,
        osuId: opponent.player.osuId,
        avatarUrl: `https://a.ppy.sh/${opponent.player.osuId}`,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      desktop: processedData.slice(0, 10),
      mobile: processedData.slice(0, 7),
    };
  }, [opponents]);

  if (chartData.desktop.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="items-center">
          <CardTitle>Frequent Opponents</CardTitle>
          <CardDescription>No opponent data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const createCustomXAxisTick = (data: ChartDataEntry[]) => {
    const TickComponent = (props: {
      x?: number;
      y?: number;
      payload?: { value: string };
    }) => {
      const { x, y, payload } = props;
      const player = data.find((p) => p.username === payload?.value);

      if (!player || x === undefined || y === undefined) return <g />;

      return (
        <g transform={`translate(${x},${y})`}>
          <foreignObject x={-16} y={5} width={32} height={32}>
            <div
              onClick={() => router.push(`/players/${player.osuId}`)}
              style={{ cursor: 'pointer' }}
            >
              <Image
                src={player.avatarUrl}
                alt={player.username}
                width={32}
                height={32}
                className="rounded-full"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </foreignObject>
        </g>
      );
    };
    TickComponent.displayName = 'CustomXAxisTick';
    return TickComponent;
  };

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataEntry }>;
  }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload as ChartDataEntry;

    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Image
            src={data.avatarUrl}
            alt={data.username}
            width={40}
            height={40}
            className="rounded-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
          <div>
            <p className="font-semibold">{data.username}</p>
            <p className="text-sm text-muted-foreground">
              Matches played: {data.frequency}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle>Frequent Opponents</CardTitle>
        <CardDescription>
          Most frequently played against opponents
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden pb-0 font-sans">
        {/* Desktop version */}
        <div className="hidden md:block">
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart
              data={chartData.desktop}
              margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="username"
                tick={createCustomXAxisTick(chartData.desktop)}
                interval={0}
                height={50}
              />
              <YAxis
                domain={[0, 'dataMax']}
                tickFormatter={(value: number) => value.toString()}
                allowDecimals={false}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="frequency"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ChartContainer>
        </div>
        {/* Mobile version */}
        <div className="block md:hidden">
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart
              data={chartData.mobile}
              margin={{ top: 20, right: 0, left: -30, bottom: 0 }}
            >
              <XAxis
                dataKey="username"
                tick={createCustomXAxisTick(chartData.mobile)}
                interval={0}
                height={50}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={(value: number) => value.toString()}
              />
              <ChartTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="frequency"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                barSize={30}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
