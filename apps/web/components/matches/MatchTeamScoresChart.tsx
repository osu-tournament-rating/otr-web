'use client';

import { Team, VerificationStatus } from '@otr/core/osu';
import { ChartLine } from 'lucide-react';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { ChartLegend } from '@/components/kit/charts/ChartLegend';
import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { getBeatmapArtist, getBeatmapTitle } from '@/lib/beatmaps/presentation';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import {
  CHART_CURSOR,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  chartAxisProps,
  chartGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatCompactTick, formatCountTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getNiceTicks,
} from '@/lib/kit/charts/ticks';
import { getTeamColor } from '@/lib/kit/color/teams';
import { formatMods } from '@/lib/kit/format/mods';
import { formatCount, formatCountOf } from '@/lib/kit/format/number';
import type { Game } from '@/lib/orpc/schema/match';

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

const SERIES = [
  { key: 'redScore', label: 'Red team', color: getTeamColor(Team.Red) },
  { key: 'blueScore', label: 'Blue team', color: getTeamColor(Team.Blue) },
] as const;

const SERIES_LABELS: Record<string, string> = Object.fromEntries(
  SERIES.map((series) => [series.key, series.label])
);

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
        beatmapTitle: game.beatmap
          ? (getBeatmapTitle(game.beatmap) ?? 'Unknown title')
          : 'Unknown title',
        beatmapArtist: game.beatmap
          ? (getBeatmapArtist(game.beatmap) ?? 'Unknown artist')
          : 'Unknown artist',
        beatmapDifficulty: game.beatmap?.diffName ?? 'Unknown difficulty',
        mods: formatMods(game.mods ?? 0),
        scoreDifference,
      },
    ];
  });
}

/** The result of one game, as the tooltip's footer and the chart's summary say it. */
function describeResult(point: TeamScoreChartPoint): string {
  if (point.winner === 'tie') return 'Game tied';
  const team = point.winner === 'red' ? 'Red' : 'Blue';
  return `${team} wins by ${formatCount(Math.abs(point.scoreDifference))}`;
}

function TooltipTitle({ point }: { point: TeamScoreChartPoint }) {
  return (
    <div className="flex max-w-64 flex-col gap-0.5">
      <span className="flex items-center justify-between gap-3">
        <span>Game {point.mapNumber}</span>
        <span className="font-normal text-muted-foreground">{point.mods}</span>
      </span>
      <span className="truncate font-normal">
        {point.beatmapArtist} – {point.beatmapTitle}
      </span>
      <span className="truncate font-normal text-muted-foreground">
        [{point.beatmapDifficulty}]
      </span>
    </div>
  );
}

const pointOf = (payload: readonly { payload?: unknown }[]) =>
  payload[0]?.payload as TeamScoreChartPoint | undefined;

/**
 * Each team's verified total per game, as two lines in the team colours,
 * with the beatmap and result of a game on hover.
 */
export default function MatchTeamScoresChart({
  games,
}: {
  games: Game[] | undefined;
}) {
  const isNarrow = useIsNarrowChart();
  const chartData = useMemo(() => buildTeamScoreChartData(games), [games]);

  const xTicks = useMemo(() => {
    const numbers = chartData.map((point) => point.mapNumber);
    return getNiceTicks(Math.min(...numbers), Math.max(...numbers), {
      integer: true,
      within: true,
      maxTicks: isNarrow ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS,
    });
  }, [chartData, isNarrow]);
  const yTicks = useMemo(() => {
    const scores = chartData.flatMap((point) => [
      point.redScore,
      point.blueScore,
    ]);
    return getNiceTicks(Math.min(...scores), Math.max(...scores), {
      integer: true,
    });
  }, [chartData]);

  if (chartData.length === 0) {
    return null;
  }

  const count = (winner: TeamScoreChartPoint['winner']) =>
    formatCountOf(
      chartData.filter((point) => point.winner === winner).length,
      'game'
    );
  const ties = chartData.filter((point) => point.winner === 'tie').length;

  return (
    <Panel data-testid="team-scores-chart">
      <SectionHeader
        icon={ChartLine}
        title="Team score progression"
        meta={formatCountOf(chartData.length, 'verified game')}
      />
      <PanelBody className="flex flex-col gap-3">
        <ChartLegend
          marker="line"
          items={SERIES.map((series) => ({
            key: series.key,
            label: series.label,
            color: series.color,
          }))}
        />
        <ChartContainer
          config={{}}
          className="aspect-auto h-60 w-full sm:h-72"
          role="img"
          aria-label={`Line chart of verified team scores. Red won ${count('red')}, Blue won ${count('blue')}, and ${formatCountOf(ties, 'game')} ${ties === 1 ? 'was' : 'were'} tied.`}
        >
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid {...chartGridProps} />
            <XAxis
              {...chartAxisProps}
              {...niceAxisProps(xTicks)}
              dataKey="mapNumber"
              tickFormatter={formatCountTick}
            />
            <YAxis
              {...chartValueAxisProps}
              {...niceAxisProps(yTicks)}
              tickFormatter={formatCompactTick}
            />
            <ChartTooltip
              cursor={CHART_CURSOR.line}
              content={
                <ChartTooltipContent
                  marker="line"
                  valueFormatter={formatCountTick}
                  nameFormatter={(key) => SERIES_LABELS[key] ?? key}
                  labelFormatter={(_, payload) => {
                    const point = pointOf(payload);
                    return point ? <TooltipTitle point={point} /> : null;
                  }}
                  footer={(payload) => {
                    const point = pointOf(payload);
                    return point ? describeResult(point) : null;
                  }}
                />
              }
            />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={CHART_LINE_WIDTH}
                dot={{ r: 3, fill: series.color, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </PanelBody>
    </Panel>
  );
}
