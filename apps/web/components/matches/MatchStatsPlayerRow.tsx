import { Team } from '@otr/core/osu';
import { ArrowRight, Trophy } from 'lucide-react';

import { RatingDelta } from '@/components/kit/format/RatingDelta';
import { Badge } from '@/components/kit/status/Badge';
import { DataTableCell, DataTableRow } from '@/components/kit/tables/DataTable';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { MissingValue } from '@/components/kit/tables/MissingValue';
import { PhoneRow } from '@/components/kit/tables/PhoneRow';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import { getTeamColor } from '@/lib/kit/color/teams';
import { TEAM_LABELS } from '@/lib/kit/format/enum-labels';
import {
  formatAccuracy,
  formatCount,
  formatRating,
} from '@/lib/kit/format/number';

import {
  formatAverage,
  formatMatchCost,
  type ProcessedPlayerStats,
} from './MatchStatsUtils';

/** Which columns the table hides below desktop width; phones show rows. */
export const PLAYER_STATS_COLUMN = {
  rating: 'lg',
  score: 'lg',
  misses: 'lg',
  placement: 'lg',
} as const;

const TEAMS = { red: Team.Red, blue: Team.Blue } as const;

function PlayerBadges({ player }: { player: ProcessedPlayerStats }) {
  const team = player.team ? TEAMS[player.team] : null;

  return (
    <>
      {team !== null ? (
        <Badge size="sm" variant="outline" swatch={getTeamColor(team)}>
          {TEAM_LABELS[team]}
        </Badge>
      ) : null}
      {player.won ? (
        <Badge size="sm">
          <Trophy aria-hidden="true" />
          Winner
        </Badge>
      ) : null}
    </>
  );
}

function PlayerName({
  player,
  avatarSize,
}: {
  player: ProcessedPlayerStats;
  avatarSize: number;
}) {
  return (
    <EntityLink
      href={`/players/${player.playerId}`}
      leading={
        <OsuAvatar
          osuId={player.osuId}
          username={player.username}
          size={avatarSize}
        />
      }
    >
      {player.username}
    </EntityLink>
  );
}

function formatRecord(player: ProcessedPlayerStats, showRecord: boolean) {
  return showRecord
    ? `${formatCount(player.gamesWon)}–${formatCount(player.gamesLost)}`
    : formatCount(player.gamesPlayed);
}

/** The rating before and after the match: `1,524 → 1,513`. */
function RatingRange({ player }: { player: ProcessedPlayerStats }) {
  if (player.ratingBefore === null || player.ratingAfter === null) {
    return <MissingValue />;
  }

  const before = formatRating(player.ratingBefore);
  const after = formatRating(player.ratingAfter);

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      {/* A plain span can't carry an aria-label, so the words are sr-only. */}
      <span className="sr-only">{`Rating changed from ${before} to ${after}`}</span>
      <span className="text-muted-foreground" aria-hidden="true">
        {before}
      </span>
      <ArrowRight className="size-3 text-muted-foreground" aria-hidden="true" />
      <span className="font-medium" aria-hidden="true">
        {after}
      </span>
    </span>
  );
}

/** One player in the player performance table, from tablet width. */
export function PlayerStatsTableRow({
  player,
  showRecord,
}: {
  player: ProcessedPlayerStats;
  showRecord: boolean;
}) {
  return (
    <DataTableRow
      data-testid={`player-stats-row-${player.playerId}`}
      data-match-cost={player.matchCost}
    >
      <DataTableCell>
        <div className="flex min-w-0 items-center gap-2">
          <PlayerName player={player} avatarSize={24} />
          <PlayerBadges player={player} />
        </div>
      </DataTableCell>
      <DataTableCell numeric>
        {showRecord ? (
          <>
            <span className="sr-only">{`${formatCount(player.gamesWon)} wins and ${formatCount(player.gamesLost)} losses`}</span>
            <span aria-hidden="true">{formatRecord(player, true)}</span>
          </>
        ) : (
          formatRecord(player, false)
        )}
      </DataTableCell>
      <DataTableCell numeric className="font-medium">
        {formatMatchCost(player.matchCost)}
      </DataTableCell>
      <DataTableCell numeric showFrom={PLAYER_STATS_COLUMN.rating}>
        <RatingRange player={player} />
      </DataTableCell>
      <DataTableCell numeric>
        {player.ratingDelta === null ? null : (
          <RatingDelta value={player.ratingDelta} />
        )}
      </DataTableCell>
      <DataTableCell numeric showFrom={PLAYER_STATS_COLUMN.score}>
        {formatCount(player.averageScore)}
      </DataTableCell>
      <DataTableCell numeric>
        {formatAccuracy(player.averageAccuracy)}
      </DataTableCell>
      <DataTableCell numeric showFrom={PLAYER_STATS_COLUMN.misses}>
        {formatAverage(player.averageMisses)}
      </DataTableCell>
      <DataTableCell numeric showFrom={PLAYER_STATS_COLUMN.placement}>
        {formatAverage(player.averagePlacement)}
      </DataTableCell>
    </DataTableRow>
  );
}

/** One label and value under a phone row's name. */
function PhoneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * One player on a phone: the name and badges, the rating change on the
 * right with the rating under it, and every per-game figure underneath, so
 * nothing the table shows is lost.
 */
export function PlayerStatsPhoneRow({
  player,
  showRecord,
}: {
  player: ProcessedPlayerStats;
  showRecord: boolean;
}) {
  return (
    <PhoneRow
      data-testid={`player-stats-phone-row-${player.playerId}`}
      align="start"
      title={
        <>
          <PlayerName player={player} avatarSize={24} />
          <PlayerBadges player={player} />
        </>
      }
      value={
        player.ratingDelta === null ? null : (
          <RatingDelta value={player.ratingDelta} />
        )
      }
      valueDescription={<RatingRange player={player} />}
    >
      <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2">
        <PhoneMetric
          label="Match cost"
          value={formatMatchCost(player.matchCost)}
        />
        <PhoneMetric
          label={showRecord ? 'Record' : 'Games'}
          value={formatRecord(player, showRecord)}
        />
        <PhoneMetric
          label="Avg. score"
          value={formatCount(player.averageScore)}
        />
        <PhoneMetric
          label="Accuracy"
          value={formatAccuracy(player.averageAccuracy)}
        />
        <PhoneMetric
          label="Misses"
          value={formatAverage(player.averageMisses)}
        />
        <PhoneMetric
          label="Placement"
          value={formatAverage(player.averagePlacement)}
        />
      </dl>
    </PhoneRow>
  );
}
