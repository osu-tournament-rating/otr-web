'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card } from '@/components/ui/card';
import { Game } from '@/lib/orpc/schema/match';
import { ModsEnumHelper } from '@/lib/enum-helpers';
import { Mods, Team, VerificationStatus } from '@otr/core/osu';

interface TeamScoresChartProps {
  games: Game[] | undefined;
}

export interface TeamScoreChartPoint {
  mapNumber: number;
  mapLabel: string;
  redScore: number;
  blueScore: number;
  winner: 'red' | 'blue' | 'tie';
  beatmapTitle: string;
  beatmapArtist: string;
  beatmapDifficulty: string;
  mods: string;
  scoreDifference: number;
}

const CHART_CONFIG = {
  redScore: {
    label: 'Red team',
    color: 'var(--team-red)',
  },
  blueScore: {
    label: 'Blue team',
    color: 'var(--team-blue)',
  },
} satisfies ChartConfig;

function formatMods(mods: number): string {
  if (mods === 0 || mods === Mods.None) return 'NM';

  const modTexts = ModsEnumHelper.getFlags(mods as Mods)
    .map((flag) => ModsEnumHelper.metadata[flag].text)
    .filter(Boolean);

  return modTexts.length > 0 ? modTexts.join(' ') : 'NM';
}

export function buildTeamScoreChartData(
  games: Game[] | undefined
): TeamScoreChartPoint[] {
  if (!games?.length) return [];

  return games.flatMap((game, gameIndex): TeamScoreChartPoint[] => {
    if (game.verificationStatus !== VerificationStatus.Verified) {
      return [];
    }

    const verifiedScores = game.scores.filter(
      (score) => score.verificationStatus === VerificationStatus.Verified
    );
    const redScores = verifiedScores.filter((score) => score.team === Team.Red);
    const blueScores = verifiedScores.filter(
      (score) => score.team === Team.Blue
    );

    if (redScores.length === 0 && blueScores.length === 0) {
      return [];
    }

    const redScore = redScores.reduce((total, score) => total + score.score, 0);
    const blueScore = blueScores.reduce(
      (total, score) => total + score.score,
      0
    );
    const scoreDifference = redScore - blueScore;

    return [
      {
        mapNumber: gameIndex + 1,
        mapLabel: `${gameIndex + 1}`,
        redScore,
        blueScore,
        winner:
          scoreDifference > 0 ? 'red' : scoreDifference < 0 ? 'blue' : 'tie',
        beatmapTitle: game.beatmap?.beatmapset?.title ?? 'Unknown title',
        beatmapArtist: game.beatmap?.beatmapset?.artist ?? 'Unknown artist',
        beatmapDifficulty: game.beatmap?.diffName ?? 'Unknown difficulty',
        mods: formatMods(game.mods ?? 0),
        scoreDifference,
      },
    ];
  });
}

function getYAxis(data: TeamScoreChartPoint[]) {
  const scores = data.flatMap((point) => [point.redScore, point.blueScore]);

  if (scores.length === 0) {
    return {
      domain: [0, 100_000] as [number, number],
      ticks: [0, 25_000, 50_000, 75_000, 100_000],
    };
  }

  const minimum = Math.min(...scores);
  const maximum = Math.max(...scores);
  const spread = maximum - minimum;
  const padding = Math.max(spread * 0.1, 5_000);
  const domainMinimum = Math.max(
    0,
    Math.floor((minimum - padding) / 5_000) * 5_000
  );
  let domainMaximum = Math.ceil((maximum + padding) / 5_000) * 5_000;

  if (domainMaximum <= domainMinimum) {
    domainMaximum = domainMinimum + 20_000;
  }

  const interval = (domainMaximum - domainMinimum) / 4;

  return {
    domain: [domainMinimum, domainMaximum] as [number, number],
    ticks: Array.from(
      { length: 5 },
      (_, index) => domainMinimum + interval * index
    ),
  };
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TeamScoreChartPoint }>;
}

function TeamScoreTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) return null;

  const result =
    point.winner === 'tie'
      ? 'Map tied'
      : `${point.winner === 'red' ? 'Red' : 'Blue'} wins by ${Math.abs(point.scoreDifference).toLocaleString()}`;

  return (
    <div className="max-w-72 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md">
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <span>Game {point.mapNumber}</span>
        <span>{point.mods}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium">
        {point.beatmapArtist} – {point.beatmapTitle}
      </p>
      <p className="truncate text-muted-foreground">
        [{point.beatmapDifficulty}]
      </p>

      <div className="mt-3 space-y-1.5 border-t pt-2.5 tabular-nums">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-(--team-red)"
              aria-hidden="true"
            />
            Red team
          </span>
          <span className="font-medium">{point.redScore.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full bg-(--team-blue)"
              aria-hidden="true"
            />
            Blue team
          </span>
          <span className="font-medium">
            {point.blueScore.toLocaleString()}
          </span>
        </div>
      </div>

      <p className="mt-2 border-t pt-2 text-muted-foreground">{result}</p>
    </div>
  );
}

function formatAxisScore(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return value.toString();
}

function formatGameCount(value: number): string {
  return `${value} ${value === 1 ? 'game' : 'games'}`;
}

export default function MatchTeamScoresChart({ games }: TeamScoresChartProps) {
  const chartData = useMemo(() => buildTeamScoreChartData(games), [games]);
  const { domain, ticks } = useMemo(() => getYAxis(chartData), [chartData]);
  const redWins = chartData.filter((point) => point.winner === 'red').length;
  const blueWins = chartData.filter((point) => point.winner === 'blue').length;
  const ties = chartData.filter((point) => point.winner === 'tie').length;

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card data-testid="team-scores-chart" className="gap-4 !p-4 sm:!p-6">
      <div className="flex items-start gap-2">
        <LineChartIcon className="mt-0.5 size-6 shrink-0 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Team Score Progression</h3>
          <p className="text-sm text-muted-foreground">
            Verified team totals across {chartData.length}{' '}
            {chartData.length === 1 ? 'game' : 'games'}
          </p>
        </div>
      </div>

      <ChartContainer
        config={CHART_CONFIG}
        className="aspect-auto h-[240px] w-full sm:h-[300px]"
        role="img"
        aria-label={`Line chart of verified team scores. Red won ${formatGameCount(redWins)}, Blue won ${formatGameCount(blueWins)}, and ${formatGameCount(ties)} ${ties === 1 ? 'was' : 'were'} tied.`}
      >
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="mapLabel"
            tickLine={false}
            axisLine={false}
            minTickGap={20}
            tickMargin={8}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickFormatter={formatAxisScore}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={44}
          />
          <ChartTooltip content={<TeamScoreTooltip />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="redScore"
            stroke="var(--color-redScore)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--color-redScore)', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="blueScore"
            stroke="var(--color-blueScore)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--color-blueScore)', strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </Card>
  );
}
