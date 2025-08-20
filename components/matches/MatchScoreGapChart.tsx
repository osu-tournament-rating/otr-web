'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Card } from '@/components/ui/card';
import { GameDTO, Team } from '@osu-tournament-rating/otr-api-client';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreGapChartProps {
  games: GameDTO[] | undefined;
}

interface ChartDataPoint {
  mapNumber: number;
  scoreDifference: number;
  winner: 'red' | 'blue' | 'tie';
  redScore: number;
  blueScore: number;
  beatmapTitle: string;
  beatmapArtist: string;
  beatmapDifficulty: string;
  beatmapId: number;
  mods: string;
}

const CHART_CONFIG = {
  red: {
    label: 'Red Team',
    color: '#ef4444',
  },
  blue: {
    label: 'Blue Team',
    color: '#3b82f6',
  },
  tie: {
    label: 'Tied',
    color: '#6b7280',
  },
} as const;

const CHART_CONSTANTS = {
  BAR_RADIUS: 4,
  MAX_BAR_SIZE: 60,
  Y_AXIS_WIDTH: 60,
  DEFAULT_MARGIN: { top: 20, right: 20, bottom: 30, left: 20 },
} as const;

function formatMods(mods: number): string {
  // Convert mod bitflags to readable string
  const modMap: Record<number, string> = {
    0: 'NM',
    1: 'NF',
    2: 'EZ',
    4: 'TD',
    8: 'HD',
    16: 'HR',
    32: 'SD',
    64: 'DT',
    128: 'RX',
    256: 'HT',
    512: 'NC',
    1024: 'FL',
    2048: 'AT',
    4096: 'SO',
    8192: 'AP',
    16384: 'PF',
  };

  if (mods === 0) return 'NM';

  const activeMods: string[] = [];
  Object.entries(modMap).forEach(([bit, name]) => {
    if (mods & parseInt(bit)) {
      activeMods.push(name);
    }
  });

  return activeMods.join(' ');
}

function calculateYAxisDomain(data: ChartDataPoint[]): [number, number] {
  if (data.length === 0) return [-100000, 100000];

  const maxAbsValue = Math.max(...data.map((d) => Math.abs(d.scoreDifference)));

  // Round up to nice numbers
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxAbsValue)));
  const rounded = Math.ceil(maxAbsValue / magnitude) * magnitude;

  return [-rounded, rounded];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload as ChartDataPoint;
  const isRedWin = data.winner === 'red';
  const isBlueWin = data.winner === 'blue';

  return (
    <div className="rounded-lg border bg-background p-3 shadow-xl">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded',
            isRedWin && 'bg-red-500/10',
            isBlueWin && 'bg-blue-500/10',
            data.winner === 'tie' && 'bg-gray-500/10'
          )}
        >
          {isRedWin && <TrendingUp className="h-4 w-4 text-red-500" />}
          {isBlueWin && <TrendingDown className="h-4 w-4 text-blue-500" />}
          {data.winner === 'tie' && (
            <BarChart3 className="h-4 w-4 text-gray-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">Map {data.mapNumber}</p>
          <p className="text-xs text-muted-foreground">
            {data.winner === 'tie'
              ? 'Tied'
              : `${data.winner === 'red' ? 'Red' : 'Blue'} wins`}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-2">
        <div className="text-xs">
          <p className="font-medium text-foreground">
            {data.beatmapArtist} - {data.beatmapTitle}
          </p>
          <p className="text-muted-foreground">[{data.beatmapDifficulty}]</p>
        </div>

        {data.mods !== 'NM' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Mods:</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
              {data.mods}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-red-500" />
            <span className="text-xs font-medium">
              {data.redScore.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">vs</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-xs font-medium">
              {data.blueScore.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="border-t pt-1.5">
          <p className="text-xs">
            <span className="text-muted-foreground">Score Gap:</span>{' '}
            <span className="font-semibold">
              {Math.abs(data.scoreDifference).toLocaleString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MatchScoreGapChart({ games }: ScoreGapChartProps) {
  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];

    return games
      .filter((game) => game.rosters && game.rosters.length >= 2)
      .map((game, index) => {
        const redRoster = game.rosters.find((r) => r.team === Team.Red);
        const blueRoster = game.rosters.find((r) => r.team === Team.Blue);

        const redScore = redRoster?.score || 0;
        const blueScore = blueRoster?.score || 0;
        const scoreDifference = redScore - blueScore;

        let winner: 'red' | 'blue' | 'tie' = 'tie';
        if (scoreDifference > 0) winner = 'red';
        else if (scoreDifference < 0) winner = 'blue';

        return {
          mapNumber: index + 1,
          scoreDifference,
          winner,
          redScore,
          blueScore,
          beatmapTitle: game.beatmap?.beatmapset?.title || 'Unknown',
          beatmapArtist: game.beatmap?.beatmapset?.artist || 'Unknown',
          beatmapDifficulty: game.beatmap?.diffName || 'Unknown',
          beatmapId: game.beatmap?.osuId || 0,
          mods: formatMods(game.mods || 0),
        } as ChartDataPoint;
      });
  }, [games]);

  if (!games || games.length === 0) {
    return null;
  }

  const yDomain = calculateYAxisDomain(chartData);

  return (
    <Card className="p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">Score Progression</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Team score differences across all maps
          </p>
        </div>
      </div>

      <ChartContainer config={CHART_CONFIG} className="h-[400px] w-full">
        <BarChart data={chartData} margin={CHART_CONSTANTS.DEFAULT_MARGIN}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted/30"
            vertical={false}
          />
          <XAxis
            dataKey="mapNumber"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}`}
            label={{
              value: 'Map',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: 12, fill: 'var(--foreground)' },
            }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const absValue = Math.abs(value);
              if (absValue >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              } else if (absValue >= 1000) {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value.toString();
            }}
            width={CHART_CONSTANTS.Y_AXIS_WIDTH}
            label={{
              value: 'Score Difference',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 12, fill: 'var(--foreground)' },
            }}
          />
          <ReferenceLine
            y={0}
            stroke="var(--foreground)"
            strokeWidth={1}
            strokeOpacity={0.3}
          />
          <ChartTooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'transparent' }}
          />
          <Bar
            dataKey="scoreDifference"
            radius={CHART_CONSTANTS.BAR_RADIUS}
            maxBarSize={CHART_CONSTANTS.MAX_BAR_SIZE}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.winner === 'red'
                    ? CHART_CONFIG.red.color
                    : entry.winner === 'blue'
                      ? CHART_CONFIG.blue.color
                      : CHART_CONFIG.tie.color
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          <span className="text-muted-foreground">Red advantage</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          <span className="text-muted-foreground">Blue advantage</span>
        </div>
      </div>
    </Card>
  );
}
