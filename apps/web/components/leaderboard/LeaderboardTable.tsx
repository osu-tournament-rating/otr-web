import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  leaderboardHref,
  type LeaderboardListState,
} from '@/app/leaderboard/list-params';
import TierIcon from '@/components/icons/TierIcon';
import { Badge } from '@/components/kit/status/Badge';
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
import { SortableHeader } from '@/components/kit/tables/SortableHeader';
import CountryFlag from '@/components/shared/CountryFlag';
import SimpleTooltip from '@/components/simple-tooltip';
import TapTooltip from '@/components/tap-tooltip';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import {
  formatCount,
  formatCountOf,
  formatPercent,
  formatRank,
  formatRating,
  formatRatingPrecise,
} from '@/lib/kit/format/number';
import type { SortState } from '@/lib/kit/lists/sort';
import type {
  LeaderboardEntry,
  LeaderboardSort,
} from '@/lib/orpc/schema/leaderboard';
import { type TierName, getTierString } from '@/lib/utils/tierData';

import { getCountryName } from './countries';

/** Win rate means nothing before a player's first match. */
function getWinRate(entry: LeaderboardEntry): number | null {
  return entry.matchesPlayed > 0 ? entry.winRate : null;
}

function getTier(entry: LeaderboardEntry) {
  const tier = entry.tierProgress.currentTier as TierName;
  const subTier = entry.tierProgress.currentSubTier ?? undefined;
  return { tier, subTier, name: getTierString(tier, subTier) };
}

function TierMark({ entry, size }: { entry: LeaderboardEntry; size: number }) {
  const { tier, subTier } = getTier(entry);
  return (
    <TierIcon
      tier={tier}
      subTier={subTier}
      tooltip
      width={size}
      height={size}
    />
  );
}

/**
 * The player's name with the avatar inside the same link, then the flag,
 * which narrows the leaderboard to that country as it always has.
 */
function PlayerName({
  entry,
  state,
  isYou,
  showCountryRank,
}: {
  entry: LeaderboardEntry;
  state: LeaderboardListState;
  isYou: boolean;
  showCountryRank: boolean;
}) {
  const { player } = entry;
  const countryName = getCountryName(player.country);
  const countryRank = formatRank(entry.countryRank);

  return (
    <span className="flex min-w-0 items-center gap-2">
      <EntityLink
        href={`/players/${player.id}?ruleset=${entry.ruleset}`}
        leading={
          <OsuAvatar
            osuId={player.osuId}
            username={player.username}
            size={24}
          />
        }
      >
        {player.username}
      </EntityLink>
      {/* The tooltip names the country on hover and keyboard focus; on a
          phone, a tap follows the link and the active-filter chip names it. */}
      <SimpleTooltip content={countryName}>
        <Link
          href={leaderboardHref(state, { country: player.country })}
          prefetch={false}
          aria-label={`${countryRank} in ${countryName}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-xs font-medium text-muted-foreground tabular-nums transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <CountryFlag country={player.country} showTooltip={false} />
          {showCountryRank ? (
            <span aria-hidden="true">{countryRank}</span>
          ) : null}
        </Link>
      </SimpleTooltip>
      {isYou ? (
        <Badge size="sm" tone="primary">
          You
        </Badge>
      ) : null}
    </span>
  );
}

/**
 * The phone row's muted line: the count the list is sorted by, which the
 * phone otherwise hides, or else the win rate. One fact, because two
 * ("146 tournaments · 62.6% win rate") don't fit beside a wide rank at
 * 390px and the line truncates mid-word.
 */
function getPhoneDescription(
  entry: LeaderboardEntry,
  sortKey: LeaderboardSort
): ReactNode {
  let text: string | null;
  if (sortKey === 'tournaments') {
    text = formatCountOf(entry.tournamentsPlayed, 'tournament');
  } else if (sortKey === 'matches') {
    text = formatCountOf(entry.matchesPlayed, 'match', 'matches');
  } else {
    const winRate = getWinRate(entry);
    text = winRate === null ? null : `${formatPercent(winRate)} win rate`;
  }
  // The row's body text is proportional; numbers that stack row on row
  // take tabular figures.
  return text === null ? null : <span className="tabular-nums">{text}</span>;
}

/**
 * The leaderboard's rows: a table from tablet width, with sortable rating,
 * tournaments, matches and win rate headers, and phone rows below it. Only
 * the names and flags link, so rows get no hover tint.
 */
export default function LeaderboardTable({
  rows,
  state,
  currentPlayerId,
}: {
  rows: readonly LeaderboardEntry[];
  state: LeaderboardListState;
  currentPlayerId: number | null;
}) {
  const sort: SortState<LeaderboardSort> = state.sort;
  const getSortHref = (next: SortState<LeaderboardSort>) =>
    leaderboardHref(state, { sort: next });

  return (
    <DataTable
      data-testid="leaderboard-table"
      aria-label="Leaderboard"
      stickyHeader
      phoneRows={
        <PhoneRowList as="ol" aria-label="Leaderboard">
          {rows.map((entry) => {
            const isYou = entry.player.id === currentPlayerId;
            return (
              <PhoneRow
                key={entry.player.id}
                data-testid={`leaderboard-phone-row-${entry.player.id}`}
                highlight={isYou}
                rank={formatRank(entry.globalRank)}
                title={
                  <PlayerName
                    entry={entry}
                    state={state}
                    isYou={isYou}
                    showCountryRank={false}
                  />
                }
                description={getPhoneDescription(entry, sort.key)}
                valueAdornment={<TierMark entry={entry} size={22} />}
                value={formatRating(entry.rating)}
              />
            );
          })}
        </PhoneRowList>
      }
    >
      <DataTableHeader>
        <DataTableRow>
          <DataTableHead>Rank</DataTableHead>
          <DataTableHead>Player</DataTableHead>
          <DataTableHead>Tier</DataTableHead>
          <SortableHeader
            sortKey="rating"
            sort={sort}
            getSortHref={getSortHref}
            numeric
          >
            Rating
          </SortableHeader>
          <SortableHeader
            sortKey="tournaments"
            sort={sort}
            getSortHref={getSortHref}
            numeric
          >
            Tournaments
          </SortableHeader>
          <SortableHeader
            sortKey="matches"
            sort={sort}
            getSortHref={getSortHref}
            numeric
          >
            Matches
          </SortableHeader>
          <SortableHeader
            sortKey="winRate"
            sort={sort}
            getSortHref={getSortHref}
            numeric
          >
            Win rate
          </SortableHeader>
        </DataTableRow>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((entry) => {
          const isYou = entry.player.id === currentPlayerId;
          const tier = getTier(entry);
          const winRate = getWinRate(entry);
          return (
            <DataTableRow
              key={entry.player.id}
              data-testid={`leaderboard-row-${entry.player.id}`}
              highlight={isYou}
            >
              <DataTableCell className="font-medium tabular-nums">
                {formatRank(entry.globalRank)}
              </DataTableCell>
              <DataTableCell>
                <PlayerName
                  entry={entry}
                  state={state}
                  isYou={isYou}
                  showCountryRank
                />
              </DataTableCell>
              <DataTableCell>
                <span className="flex items-center gap-2">
                  <TierMark entry={entry} size={22} />
                  <span className="hidden text-xs whitespace-nowrap text-muted-foreground lg:inline">
                    {tier.name}
                  </span>
                </span>
              </DataTableCell>
              <DataTableCell numeric className="font-semibold">
                <TapTooltip
                  content={`${formatRatingPrecise(entry.rating)} TR`}
                  triggerAriaLabel={`${formatRatingPrecise(entry.rating)} TR`}
                  triggerClassName="inline w-auto text-right"
                >
                  {formatRating(entry.rating)}
                </TapTooltip>
              </DataTableCell>
              <DataTableCell numeric>
                {formatCount(entry.tournamentsPlayed)}
              </DataTableCell>
              <DataTableCell numeric>
                {formatCount(entry.matchesPlayed)}
              </DataTableCell>
              <DataTableCell numeric>
                {winRate === null ? null : formatPercent(winRate)}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
