import { Ruleset } from '@otr/core/osu';
import { Trophy } from 'lucide-react';

import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { RatingDelta } from '@/components/kit/format/RatingDelta';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { formatNumber, formatRank } from '@/lib/kit/format/number';
import { TournamentPlayerStats } from '@/lib/orpc/schema/tournament';

/** Players need this many matches to count as a top performer. */
const MIN_MATCHES = 3;

function PlayerLink({
  player,
  ruleset,
}: {
  player: TournamentPlayerStats['player'];
  ruleset: Ruleset;
}) {
  return (
    <EntityLink
      href={`/players/${player.id}?ruleset=${ruleset}`}
      leading={
        <OsuAvatar osuId={player.osuId} username={player.username} size={24} />
      }
    >
      {player.username}
    </EntityLink>
  );
}

const formatMatchCost = (value: number) => formatNumber(value, { decimals: 2 });
const formatAverage = (value: number) => formatNumber(value, { decimals: 1 });

/** The three players with the best average match cost (3+ matches). */
export default function TournamentTopPerformers({
  playerStats,
  ruleset,
}: {
  playerStats: TournamentPlayerStats[];
  ruleset: Ruleset;
}) {
  const topPerformers = playerStats
    .filter((stats) => stats.matchesPlayed >= MIN_MATCHES)
    .sort((a, b) => b.averageMatchCost - a.averageMatchCost)
    .slice(0, 3);

  return (
    <Panel>
      <SectionHeader icon={Trophy} title="Top performers" />
      {topPerformers.length === 0 ? (
        <EmptyState
          size="compact"
          icon={Trophy}
          title="No qualifying performers found"
          description={`Players need at least ${MIN_MATCHES} matches to qualify.`}
        />
      ) : (
        <DataTable
          aria-label="Top performers"
          phoneRows={
            <PhoneRowList as="ol" aria-label="Top performers">
              {topPerformers.map((stats, index) => (
                <PhoneRow
                  key={stats.player.id}
                  rank={formatRank(index + 1)}
                  title={<PlayerLink player={stats.player} ruleset={ruleset} />}
                  description={`Avg. placement ${formatAverage(stats.averagePlacement)} · Avg. games ${formatAverage(stats.gamesPlayed / stats.matchesPlayed)}`}
                  value={formatMatchCost(stats.averageMatchCost)}
                  valueDescription="Match cost"
                />
              ))}
            </PhoneRowList>
          }
        >
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead className="w-16">Rank</DataTableHead>
              <DataTableHead>Player</DataTableHead>
              <DataTableHead numeric>Match cost</DataTableHead>
              <DataTableHead numeric>Avg. placement</DataTableHead>
              <DataTableHead numeric>Avg. games</DataTableHead>
              <DataTableHead numeric>Avg. rating change</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {topPerformers.map((stats, index) => (
              <DataTableRow key={stats.player.id}>
                <DataTableCell className="font-medium tabular-nums">
                  {formatRank(index + 1)}
                </DataTableCell>
                <DataTableCell>
                  <PlayerLink player={stats.player} ruleset={ruleset} />
                </DataTableCell>
                <DataTableCell numeric>
                  {formatMatchCost(stats.averageMatchCost)}
                </DataTableCell>
                <DataTableCell numeric>
                  {formatAverage(stats.averagePlacement)}
                </DataTableCell>
                <DataTableCell numeric>
                  {formatAverage(stats.gamesPlayed / stats.matchesPlayed)}
                </DataTableCell>
                <DataTableCell numeric>
                  <RatingDelta value={stats.averageRatingDelta} />
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </Panel>
  );
}
