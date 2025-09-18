'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

import { ChartTooltip } from '@/components/ui/chart';
import { Card } from '@/components/ui/card';
import { Game } from '@/lib/orpc/schema/match';
import { Mods, Team } from '@/lib/osu/enums';
import { ModsEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';

interface ScoreGapChartProps {
  games: Game[] | undefined;
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

const CHART_COLORS = {
  red: '#ef4444',
  blue: '#3b82f6',
  tie: '#6b7280',
} as const;

const CHART_CONSTANTS = {
  BAR_RADIUS: 4,
} as const;

function formatMods(mods: number): string {
  if (mods === 0 || mods === Mods.None) return 'NM';

  const modFlags = ModsEnumHelper.getFlags(mods as Mods);
  const modTexts = modFlags
    .map((flag) => ModsEnumHelper.metadata[flag].text)
    .filter((text) => text);

  return modTexts.length > 0 ? modTexts.join(' ') : 'NM';
}

function calculateYAxisDomain(data: ChartDataPoint[]): [number, number] {
  if (data.length === 0) return [-100000, 100000];

  const maxAbsValue = Math.max(...data.map((d) => Math.abs(d.scoreDifference)));

  // Round up to nice numbers
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxAbsValue)));
  const rounded = Math.ceil(maxAbsValue / magnitude) * magnitude;

  return [-rounded, rounded];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
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

    const calculateTeamScore = (team: Team) => (game: Game) =>
      game.scores
        .filter((score) => score.team === team)
        .reduce((total, score) => total + score.score, 0);

    const redScoreForGame = calculateTeamScore(Team.Red);
    const blueScoreForGame = calculateTeamScore(Team.Blue);

    return games.map((game, index) => {
      const redScore = redScoreForGame(game);
      const blueScore = blueScoreForGame(game);
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
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
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

      <div className="h-[200px] w-full sm:h-[250px] md:h-[300px] lg:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 5, bottom: 25, left: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted/30"
              vertical={false}
            />
            <XAxis
              dataKey="mapNumber"
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${value}`}
              interval={0}
              label={{
                value: 'Map',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 10, fill: 'var(--foreground)' },
              }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => {
                const absValue = Math.abs(value);
                if (absValue >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (absValue >= 1000) {
                  return `${(value / 1000).toFixed(0)}k`;
                }
                return value.toString();
              }}
              width={40}
              label={{
                value: 'Gap',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 10, fill: 'var(--foreground)' },
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
              maxBarSize={30}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.winner === 'red'
                      ? CHART_COLORS.red
                      : entry.winner === 'blue'
                        ? CHART_COLORS.blue
                        : CHART_COLORS.tie
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

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
