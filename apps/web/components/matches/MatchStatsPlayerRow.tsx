import { type Ruleset, Team } from '@otr/core/osu';
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
  formatCountOf,
  formatRating,
} from '@/lib/kit/format/number';
import { cn } from '@/lib/utils';

import {
  formatAverage,
  formatMatchCost,
  playerProfileHref,
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

/**
 * The team and Winner badges, on their own line under the name: beside it
 * they squeezed names on phones and pushed the table past its panel.
 */
function PlayerBadges({
  player,
  className,
}: {
  player: ProcessedPlayerStats;
  className?: string;
}) {
  const team = player.team ? TEAMS[player.team] : null;

  if (team === null && !player.won) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
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
    </div>
  );
}

function PlayerName({
  player,
  avatarSize,
  ruleset,
}: {
  player: ProcessedPlayerStats;
  avatarSize: number;
  ruleset?: Ruleset;
}) {
  return (
    <EntityLink
      href={playerProfileHref(player.playerId, ruleset)}
      title={player.username}
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
  ruleset,
}: {
  player: ProcessedPlayerStats;
  showRecord: boolean;
  /** The match's ruleset, which the player's link opens. */
  ruleset?: Ruleset;
}) {
  return (
    <DataTableRow
      data-testid={`player-stats-row-${player.playerId}`}
      data-match-cost={player.matchCost}
    >
      <DataTableCell>
        {/* Capped, so a name of 15 wide letters truncates instead of
            pushing the Placement column past the panel at 1024px. */}
        <div className="flex max-w-48 min-w-0 flex-col items-start gap-1">
          <PlayerName player={player} avatarSize={24} ruleset={ruleset} />
          <PlayerBadges player={player} />
        </div>
      </DataTableCell>
      <DataTableCell numeric>
        {showRecord ? (
          <>
            <span className="sr-only">{`${formatCountOf(player.gamesWon, 'win')} and ${formatCountOf(player.gamesLost, 'loss', 'losses')}`}</span>
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
 * One player on a phone: the name with its badges under it, the rating
 * change on the right with the rating under it, and every per-game figure
 * underneath, so nothing the table shows is lost.
 */
export function PlayerStatsPhoneRow({
  player,
  showRecord,
  ruleset,
}: {
  player: ProcessedPlayerStats;
  showRecord: boolean;
  /** The match's ruleset, which the player's link opens. */
  ruleset?: Ruleset;
}) {
  return (
    <PhoneRow
      data-testid={`player-stats-phone-row-${player.playerId}`}
      align="start"
      title={<PlayerName player={player} avatarSize={24} ruleset={ruleset} />}
      value={
        player.ratingDelta === null ? null : (
          <RatingDelta value={player.ratingDelta} />
        )
      }
      valueDescription={<RatingRange player={player} />}
    >
      <PlayerBadges player={player} className="mt-1" />
      {/* Columns as wide as their labels, spread across the row, so "Match
          cost" fits beside the rating range on a 375px phone. */}
      <dl className="mt-2 grid grid-cols-[repeat(3,minmax(0,auto))] justify-between gap-x-3 gap-y-2">
        <PhoneMetric
          label="Match cost"
          value={formatMatchCost(player.matchCost)}
        />
        <PhoneMetric
          label={showRecord ? 'Record' : 'Games'}
          value={formatRecord(player, showRecord)}
        />
        <PhoneMetric label="Score" value={formatCount(player.averageScore)} />
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
