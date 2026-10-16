import { VerificationStatus } from '@otr/core/osu';
import {
  Award,
  CalendarDays,
  ChartColumn,
  Gamepad2,
  Swords,
  Users,
  Zap,
} from 'lucide-react';

import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import { toDate } from '@/lib/kit/format/date';
import { EMPTY_VALUE } from '@/lib/kit/format/empty';
import {
  formatCount,
  formatCountOf,
  formatPercent,
} from '@/lib/kit/format/number';
import type { TournamentDetail } from '@/lib/orpc/schema/tournament';

const DAY_MS = 86_400_000;

/** Days from the start to the end, rounded up: `59 days`. */
function formatDuration(
  start: TournamentDetail['startTime'],
  end: TournamentDetail['endTime']
): string {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return EMPTY_VALUE;

  const days = Math.ceil(
    Math.abs(endDate.getTime() - startDate.getTime()) / DAY_MS
  );
  return formatCountOf(days, 'day');
}

/** The most matches started on one UTC day. */
function peakMatchesPerDay(matches: TournamentDetail['matches']): number {
  const perDay = new Map<string, number>();
  for (const match of matches) {
    const start = toDate(match.startTime);
    if (!start) continue;
    const day = start.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  return Math.max(0, ...perDay.values());
}

/** The Stats tab's overview: players, matches, games, length and pace. */
export default function TournamentStatsPanel({
  tournament,
}: {
  tournament: Pick<
    TournamentDetail,
    'matches' | 'playerTournamentStats' | 'startTime' | 'endTime'
  >;
}) {
  const matches = tournament.matches ?? [];
  const totalGames = matches.reduce(
    (sum, match) => sum + (match.games?.length ?? 0),
    0
  );
  const verifiedMatches = matches.filter(
    (match) => match.verificationStatus === VerificationStatus.Verified
  ).length;

  return (
    <Panel>
      <SectionHeader icon={ChartColumn} title="Tournament statistics" />
      <PanelBody>
        <StatTileGrid columns={3}>
          <StatTile
            icon={Users}
            label="Players"
            value={formatCount(tournament.playerTournamentStats?.length ?? 0)}
          />
          <StatTile
            icon={Swords}
            label="Matches"
            value={formatCount(matches.length)}
          />
          <StatTile
            icon={Gamepad2}
            label="Games"
            value={formatCount(totalGames)}
          />
          <StatTile
            icon={CalendarDays}
            label="Duration"
            value={formatDuration(tournament.startTime, tournament.endTime)}
          />
          <StatTile
            icon={Award}
            label="Verified"
            value={
              matches.length > 0
                ? formatPercent(verifiedMatches / matches.length)
                : EMPTY_VALUE
            }
          />
          <StatTile
            icon={Zap}
            label="Peak day"
            value={formatCountOf(
              peakMatchesPerDay(matches),
              'match',
              'matches'
            )}
          />
        </StatTileGrid>
      </PanelBody>
    </Panel>
  );
}
