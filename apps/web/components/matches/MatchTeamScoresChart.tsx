'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartTooltip, ChartContainer } from '@/components/ui/chart';
import { Card } from '@/components/ui/card';
import { LineChart as LineChartIcon, Trophy } from 'lucide-react';

import { Game } from '@/lib/orpc/schema/match';
import { Mods, Team } from '@otr/core/osu';
import { ModsEnumHelper } from '@/lib/enums';
import { cn } from '@/lib/utils';

interface TeamScoresChartProps {
  games: Game[] | undefined;
}

interface ChartDataPoint {
  mapNumber: number;
  mapLabel: string;
  redScore: number;
  blueScore: number;
  winner: 'red' | 'blue' | 'tie';
  beatmapTitle: string;
  beatmapArtist: string;
  beatmapDifficulty: string;
  beatmapId: number;
  mods: string;
  scoreDifference: number;
  cumulativeRedScore: number;
  cumulativeBlueScore: number;
}

const CHART_CONFIG = {
  redScore: {
    label: 'Red Team',
    color: '#ef4444',
  },
  blueScore: {
    label: 'Blue Team',
    color: '#3b82f6',
  },
} as const;

function formatMods(mods: number): string {
  if (mods === 0 || mods === Mods.None) return 'NM';

  const modFlags = ModsEnumHelper.getFlags(mods as Mods);
  const modTexts = modFlags
    .map((flag) => ModsEnumHelper.metadata[flag].text)
    .filter((text) => text);

  return modTexts.length > 0 ? modTexts.join(' ') : 'NM';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: ChartDataPoint;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as ChartDataPoint;
  const isRedWin = data.winner === 'red';
  const isBlueWin = data.winner === 'blue';
  const isTie = data.winner === 'tie';

  return (
    <div className="border-border/50 bg-background/95 rounded-xl border p-4 shadow-2xl backdrop-blur-sm">
      {/* Header with map info */}
      <div className="border-border/30 mb-3 border-b pb-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                isRedWin && 'bg-red-500/15',
                isBlueWin && 'bg-blue-500/15',
                isTie && 'bg-yellow-500/15'
              )}
            >
              <Trophy
                className={cn(
                  'h-4 w-4',
                  isRedWin && 'text-red-500',
                  isBlueWin && 'text-blue-500',
                  isTie && 'text-yellow-500'
                )}
              />
            </div>
            <div>
              <p className="text-sm font-semibold">Map {data.mapNumber}</p>
              <p className="text-muted-foreground text-xs">
                {isTie
                  ? 'Tied'
                  : `${data.winner === 'red' ? 'Red' : 'Blue'} wins`}
              </p>
            </div>
          </div>
          {data.mods !== 'NM' && (
            <div className="bg-primary/10 rounded-md px-2 py-1">
              <span className="text-primary text-xs font-medium">
                {data.mods}
              </span>
            </div>
          )}
        </div>

        {/* Beatmap info */}
        <div className="mt-2">
          <p className="text-foreground text-xs font-medium">
            {data.beatmapArtist} - {data.beatmapTitle}
          </p>
          <p className="text-muted-foreground text-xs">
            [{data.beatmapDifficulty}]
          </p>
        </div>
      </div>

      {/* Scores section */}
      <div className="space-y-3">
        {/* Map scores */}
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">
            Map Scores
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div
              className={cn(
                'rounded-lg border p-2.5',
                isRedWin
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-border/50 bg-card/50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground text-xs font-medium">
                  Red
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {data.redScore.toLocaleString()}
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg border p-2.5',
                isBlueWin
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-border/50 bg-card/50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground text-xs font-medium">
                  Blue
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {data.blueScore.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Score difference */}
        <div className="bg-muted/30 rounded-lg p-2.5">
          <p className="text-muted-foreground text-xs">Score Difference</p>
          <p className="mt-0.5 text-sm font-semibold">
            {Math.abs(data.scoreDifference).toLocaleString()} points{' '}
            <span
              className={cn(
                'text-xs',
                isRedWin && 'text-red-500',
                isBlueWin && 'text-blue-500',
                isTie && 'text-yellow-500'
              )}
            >
              {isTie
                ? '(Tied)'
                : data.winner === 'red'
                  ? 'for Red'
                  : 'for Blue'}
            </span>
          </p>
        </div>

        {/* Cumulative scores */}
        <div className="border-border/30 border-t pt-2.5">
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Total Match Score
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-semibold">
                {data.cumulativeRedScore.toLocaleString()}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">vs</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {data.cumulativeBlueScore.toLocaleString()}
              </span>
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

function CustomDot(props: CustomDotProps) {
  const { cx, cy, payload } = props;

  if (!payload || !cx || !cy) return null;

  const isWinner = payload.winner === 'red' || payload.winner === 'blue';

  if (!isWinner) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.winner === 'red' ? '#ef4444' : '#3b82f6'}
      stroke="#fff"
      strokeWidth={2}
    />
  );
}

export default function MatchTeamScoresChart({ games }: TeamScoresChartProps) {
  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];

    let cumulativeRed = 0;
    let cumulativeBlue = 0;

    const getTeamScore = (team: Team) => (game: Game) =>
      game.scores
        .filter((score) => score.team === team)
        .reduce((total, score) => total + score.score, 0);

    const redScoreForGame = getTeamScore(Team.Red);
    const blueScoreForGame = getTeamScore(Team.Blue);

    return games.map((game, index) => {
      const redScore = redScoreForGame(game);
      const blueScore = blueScoreForGame(game);
      const scoreDifference = redScore - blueScore;

      cumulativeRed += redScore;
      cumulativeBlue += blueScore;

      let winner: 'red' | 'blue' | 'tie' = 'tie';
      if (scoreDifference > 0) winner = 'red';
      else if (scoreDifference < 0) winner = 'blue';

      return {
        mapNumber: index + 1,
        mapLabel: `${index + 1}`,
        redScore,
        blueScore,
        winner,
        beatmapTitle: game.beatmap?.beatmapset?.title || 'Unknown',
        beatmapArtist: game.beatmap?.beatmapset?.artist || 'Unknown',
        beatmapDifficulty: game.beatmap?.diffName || 'Unknown',
        beatmapId: game.beatmap?.osuId || 0,
        mods: formatMods(game.mods || 0),
        scoreDifference,
        cumulativeRedScore: cumulativeRed,
        cumulativeBlueScore: cumulativeBlue,
      } as ChartDataPoint;
    });
  }, [games]);

  // y-axis tick generation: 5 ticks, rounded to nearest 5k of domain
  const { domain, ticks } = useMemo(() => {
    if (chartData.length === 0)
      return { domain: [0, 100000], ticks: [0, 25000, 50000, 75000, 100000] };

    // Find min and max values across all scores
    let minScore = Infinity;
    let maxScore = -Infinity;

    chartData.forEach((point) => {
      minScore = Math.min(minScore, point.redScore, point.blueScore);
      maxScore = Math.max(maxScore, point.redScore, point.blueScore);
    });

    // Round to nearest 5000
    const roundToNearest5k = (value: number, roundDown: boolean) => {
      const factor = 5000;
      if (roundDown) {
        return Math.floor(value / factor) * factor;
      }
      return Math.ceil(value / factor) * factor;
    };

    // Calculate domain with padding
    const domainMin = Math.max(0, roundToNearest5k(minScore - 5000, true));
    const domainMax = roundToNearest5k(maxScore + 5000, false);

    const interval = (domainMax - domainMin) / 4;
    const ticks = Array.from({ length: 5 }, (_, i) => domainMin + interval * i);

    return { domain: [domainMin, domainMax], ticks };
  }, [chartData]);

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 pb-0">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <LineChartIcon className="text-primary h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">Team Score Progression</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Red vs Blue team scores across all beatmaps
          </p>
        </div>
      </div>

      <ChartContainer
        config={CHART_CONFIG}
        className="h-[250px] w-full sm:h-[300px] md:h-[350px] lg:h-[400px]"
      >
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted/30"
            vertical={false}
          />

          <XAxis
            dataKey="mapLabel"
            tick={{ fontSize: 11 }}
            interval={0}
            label={{
              value: 'Beatmap',
              position: 'insideBottom',
              offset: -5,
              style: { fontSize: 11, fill: 'var(--muted-foreground)' },
            }}
          />

          <YAxis
            domain={domain}
            ticks={ticks}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value.toString();
            }}
            label={{
              value: 'Score',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 11, fill: 'var(--muted-foreground)' },
            }}
          />

          <ChartTooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: '3 3' }}
          />

          <Line
            type="monotone"
            dataKey="redScore"
            stroke="#ef4444"
            strokeWidth={2.5}
            dot={(props) => {
              const { key, ...dotProps } = props;
              return <CustomDot key={key} {...dotProps} />;
            }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />

          <Line
            type="monotone"
            dataKey="blueScore"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={(props) => {
              const { key, ...dotProps } = props;
              return <CustomDot key={key} {...dotProps} />;
            }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />
        </LineChart>
      </ChartContainer>
    </Card>
  );
}
