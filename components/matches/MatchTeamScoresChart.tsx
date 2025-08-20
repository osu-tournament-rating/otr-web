'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  Dot,
  Legend,
} from 'recharts';
import { ChartTooltip, ChartContainer } from '@/components/ui/chart';
import { Card } from '@/components/ui/card';
import { GameDTO, Team, Mods } from '@osu-tournament-rating/otr-api-client';
import { LineChart as LineChartIcon, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModsEnumHelper } from '@/lib/enums';
import { CHART_CONSTANTS } from '@/lib/utils/chart';

interface TeamScoresChartProps {
  games: GameDTO[] | undefined;
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

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload as ChartDataPoint;
  const isRedWin = data.winner === 'red';
  const isBlueWin = data.winner === 'blue';
  const isTie = data.winner === 'tie';

  return (
    <div className="rounded-xl border border-border/50 bg-background/95 p-4 shadow-2xl backdrop-blur-sm">
      {/* Header with map info */}
      <div className="mb-3 border-b border-border/30 pb-3">
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
              <p className="text-xs text-muted-foreground">
                {isTie
                  ? 'Tied'
                  : `${data.winner === 'red' ? 'Red' : 'Blue'} wins`}
              </p>
            </div>
          </div>
          {data.mods !== 'NM' && (
            <div className="rounded-md bg-primary/10 px-2 py-1">
              <span className="text-xs font-medium text-primary">
                {data.mods}
              </span>
            </div>
          )}
        </div>

        {/* Beatmap info */}
        <div className="mt-2">
          <p className="text-xs font-medium text-foreground">
            {data.beatmapArtist} - {data.beatmapTitle}
          </p>
          <p className="text-xs text-muted-foreground">
            [{data.beatmapDifficulty}]
          </p>
        </div>
      </div>

      {/* Scores section */}
      <div className="space-y-3">
        {/* Map scores */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
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
                <span className="text-xs font-medium text-muted-foreground">
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
                <span className="text-xs font-medium text-muted-foreground">
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
        <div className="rounded-lg bg-muted/30 p-2.5">
          <p className="text-xs text-muted-foreground">Score Difference</p>
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
        <div className="border-t border-border/30 pt-2.5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Total Match Score
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-semibold">
                {data.cumulativeRedScore.toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">vs</span>
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

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
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
      className="animate-pulse"
    />
  );
}

export default function MatchTeamScoresChart({ games }: TeamScoresChartProps) {
  const chartData = useMemo(() => {
    if (!games || games.length === 0) return [];

    let cumulativeRed = 0;
    let cumulativeBlue = 0;

    return games
      .filter((game) => game.rosters && game.rosters.length >= 2)
      .map((game, index) => {
        const redRoster = game.rosters.find((r) => r.team === Team.Red);
        const blueRoster = game.rosters.find((r) => r.team === Team.Blue);

        const redScore = redRoster?.score || 0;
        const blueScore = blueRoster?.score || 0;
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

  if (!games || games.length === 0) {
    return null;
  }

  const maxScore = Math.max(
    ...chartData.flatMap((d) => [d.redScore, d.blueScore])
  );
  const yAxisMax = Math.ceil(maxScore / 100000) * 100000;

  return (
    <Card className="p-4 sm:p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <LineChartIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold">Team Score Progression</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
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
          <defs>
            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>

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
            domain={[0, yAxisMax]}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              } else if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}k`;
              }
              return value.toString();
            }}
            width={45}
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
            dot={(props) => <CustomDot {...props} />}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />

          <Line
            type="monotone"
            dataKey="blueScore"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={(props) => <CustomDot {...props} />}
            activeDot={{ r: 6, strokeWidth: 0 }}
            animationDuration={1000}
          />
        </LineChart>
      </ChartContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="font-medium">Red Team</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="font-medium">Blue Team</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
