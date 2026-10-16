'use client';

import { ReportStatus } from '@otr/core/osu';
import {
  Activity,
  Flag,
  History,
  ListOrdered,
  Music2,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';

import { GallerySection, Specimen } from '../gallery';
import BeatmapCover from '@/components/beatmaps/BeatmapCover';
import TierIcon from '@/components/icons/TierIcon';
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';
import { DateRangeText } from '@/components/kit/format/DateRangeText';
import { DateText } from '@/components/kit/format/DateText';
import { Timestamp } from '@/components/kit/format/Timestamp';
import { Panel } from '@/components/kit/layout/Panel';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { Eyebrow } from '@/components/kit/layout/Typography';
import { Badge } from '@/components/kit/status/Badge';
import { NotificationDot } from '@/components/kit/status/NotificationDot';
import { ReportStatusBadge } from '@/components/kit/status/ReportStatusBadge';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import {
  DataTableLinkCell,
  DataTableLinkRow,
} from '@/components/kit/tables/DataTableLinkRow';
import { EntityLink } from '@/components/kit/tables/EntityLink';
import { LoadMore } from '@/components/kit/tables/LoadMore';
import { MissingValue } from '@/components/kit/tables/MissingValue';
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { SortableHeader } from '@/components/kit/tables/SortableHeader';
import { ViewButton } from '@/components/kit/tables/ViewButton';
import CountryFlag from '@/components/shared/CountryFlag';
import TapTooltip from '@/components/tap-tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  formatAccuracy,
  formatCount,
  formatCountOf,
  formatId,
  formatPercent,
  formatRank,
  formatRating,
} from '@/lib/kit/format/number';
import type { SortState } from '@/lib/kit/lists/sort';
import { sortRows } from '@/lib/kit/tables/sort';
import { type TierName, getTierString } from '@/lib/utils/tierData';

const KIT = '@/components/kit/tables';

// Demo links stay on the gallery.
const here = (id: string) => `#${id}`;

/** A stand-in avatar: the gallery loads no player images. */
function PlayerAvatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <Avatar style={{ width: size, height: size }}>
      <AvatarFallback className="text-xs font-medium">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

/** The tier icon, named on tap, hover and focus. */
function TierMark({
  tier,
  subTier,
  size = 20,
}: {
  tier: TierName;
  subTier?: number;
  size?: number;
}) {
  const name = getTierString(tier, subTier);
  return (
    <TapTooltip
      content={name}
      triggerAriaLabel={`Tier: ${name}`}
      triggerClassName="w-auto shrink-0 rounded-full"
    >
      <TierIcon
        tier={tier}
        subTier={subTier}
        width={size}
        height={size}
        className="block"
      />
    </TapTooltip>
  );
}

// Leaderboard ---------------------------------------------------------------

type LeaderboardRow = {
  id: number;
  rank: number;
  name: string;
  country: string;
  countryName: string;
  tier: TierName;
  subTier?: number;
  rating: number;
  tournaments: number;
  matches: number;
  winRate: number | null;
  you?: boolean;
};

const LEADERBOARD: LeaderboardRow[] = [
  {
    id: 1,
    rank: 1,
    name: 'mrekk',
    country: 'AU',
    countryName: 'Australia',
    tier: 'Elite Grandmaster',
    rating: 3121.4,
    tournaments: 58,
    matches: 1204,
    winRate: 0.724,
  },
  {
    id: 2,
    rank: 2,
    name: 'lifeline',
    country: 'US',
    countryName: 'United States',
    tier: 'Elite Grandmaster',
    rating: 3044.9,
    tournaments: 71,
    matches: 1388,
    winRate: 0.689,
  },
  {
    id: 3,
    rank: 3,
    name: 'Accolibed',
    country: 'KR',
    countryName: 'South Korea',
    tier: 'Grandmaster',
    subTier: 3,
    rating: 2912.2,
    tournaments: 44,
    matches: 902,
    winRate: 0.701,
  },
  {
    id: 4,
    rank: 4,
    name: 'Raikouhou',
    country: 'JP',
    countryName: 'Japan',
    tier: 'Grandmaster',
    subTier: 2,
    rating: 2734.6,
    tournaments: 39,
    matches: 655,
    winRate: null,
  },
  {
    id: 5,
    rank: 5,
    name: 'distantmemory',
    country: 'US',
    countryName: 'United States',
    tier: 'Grandmaster',
    subTier: 1,
    rating: 2615.3,
    tournaments: 52,
    matches: 1017,
    winRate: 0.642,
  },
  {
    id: 6,
    rank: 6,
    name: 'Yasui',
    country: 'JP',
    countryName: 'Japan',
    tier: 'Master',
    subTier: 3,
    rating: 2488.1,
    tournaments: 27,
    matches: 431,
    winRate: 0.598,
    you: true,
  },
];

type LeaderboardSortKey = 'rating' | 'tournaments' | 'matches' | 'winRate';

const LEADERBOARD_SORT: Record<
  LeaderboardSortKey,
  (row: LeaderboardRow) => number | null
> = {
  rating: (row) => row.rating,
  tournaments: (row) => row.tournaments,
  matches: (row) => row.matches,
  winRate: (row) => row.winRate,
};

const PAGE_SIZE = 50;
const PLAYER_COUNT = 8412;

/** The phone row's muted line: what the hidden columns said. */
function playerSummary(row: LeaderboardRow) {
  const parts = [formatCountOf(row.tournaments, 'tournament')];
  if (row.winRate !== null)
    parts.push(`${formatPercent(row.winRate)} win rate`);
  return parts.join(' · ');
}

function PlayerName({ row }: { row: LeaderboardRow }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <EntityLink
        href={here('tables-data-table')}
        leading={<PlayerAvatar name={row.name} />}
      >
        {row.name}
      </EntityLink>
      <CountryFlag
        country={row.country}
        tooltipContent={row.countryName}
        className="shrink-0"
      />
      {row.you ? (
        <Badge size="sm" tone="primary">
          You
        </Badge>
      ) : null}
    </span>
  );
}

function LeaderboardDemo() {
  const [sort, setSort] = useState<SortState<LeaderboardSortKey>>({
    key: 'rating',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);
  const offset = (page - 1) * PAGE_SIZE;
  const rows = sortRows(LEADERBOARD, sort, LEADERBOARD_SORT).map((row) => ({
    ...row,
    rank: row.rank + offset,
  }));

  return (
    <Panel>
      <SectionHeader
        icon={ListOrdered}
        title="Leaderboard"
        meta={`${formatCount(PLAYER_COUNT)} players`}
      />
      <DataTable
        aria-label="Leaderboard"
        phoneRows={
          <PhoneRowList as="ol" aria-label="Leaderboard">
            {rows.map((row) => (
              <PhoneRow
                key={row.id}
                highlight={row.you}
                rank={formatRank(row.rank)}
                title={<PlayerName row={row} />}
                description={playerSummary(row)}
                valueAdornment={
                  <TierMark tier={row.tier} subTier={row.subTier} size={22} />
                }
                value={formatRating(row.rating)}
              />
            ))}
          </PhoneRowList>
        }
      >
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-16">Rank</DataTableHead>
            <DataTableHead>Player</DataTableHead>
            <SortableHeader
              sortKey="rating"
              sort={sort}
              onSortChange={setSort}
              numeric
            >
              Rating
            </SortableHeader>
            <SortableHeader
              sortKey="tournaments"
              sort={sort}
              onSortChange={setSort}
              numeric
            >
              Tournaments
            </SortableHeader>
            <SortableHeader
              sortKey="matches"
              sort={sort}
              onSortChange={setSort}
              numeric
              showFrom="lg"
            >
              Matches
            </SortableHeader>
            <SortableHeader
              sortKey="winRate"
              sort={sort}
              onSortChange={setSort}
              numeric
              info="Share of verified matches won, across every ruleset."
            >
              Win rate
            </SortableHeader>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => (
            <DataTableRow key={row.id} highlight={row.you}>
              <DataTableCell className="font-medium tabular-nums">
                {formatRank(row.rank)}
              </DataTableCell>
              <DataTableCell>
                <PlayerName row={row} />
              </DataTableCell>
              <DataTableCell numeric>
                <span className="flex items-center justify-end gap-1 font-semibold">
                  <TierMark tier={row.tier} subTier={row.subTier} />
                  {formatRating(row.rating)}
                </span>
              </DataTableCell>
              <DataTableCell numeric>
                {formatCount(row.tournaments)}
              </DataTableCell>
              <DataTableCell numeric showFrom="lg">
                {formatCount(row.matches)}
              </DataTableCell>
              <DataTableCell numeric>
                {formatPercent(row.winRate)}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      <PaginationFooter
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={PLAYER_COUNT}
        onPageChange={setPage}
        label="Leaderboard pages"
      />
    </Panel>
  );
}

// Sortable headers ------------------------------------------------------------

type TournamentRow = {
  id: number;
  name: string;
  start: string;
  end: string;
  matches: number;
  players: number | null;
};

const TOURNAMENTS: TournamentRow[] = [
  {
    id: 1,
    name: 'Corsace Open 2025',
    start: '2025-09-06',
    end: '2025-10-19',
    matches: 412,
    players: 1536,
  },
  {
    id: 2,
    name: 'osu! World Cup 2025',
    start: '2025-11-01',
    end: '2025-12-14',
    matches: 128,
    players: 412,
  },
  {
    id: 3,
    name: 'Break The Meta Cup',
    start: '2024-07-20',
    end: '2024-08-03',
    matches: 96,
    players: null,
  },
];

type TournamentSortKey = 'name' | 'matches' | 'players';

const TOURNAMENT_SORT: Record<
  TournamentSortKey,
  (row: TournamentRow) => string | number | null
> = {
  name: (row) => row.name,
  matches: (row) => row.matches,
  players: (row) => row.players,
};

function SortableHeaderDemo() {
  const [sort, setSort] = useState<SortState<TournamentSortKey>>({
    key: 'matches',
    direction: 'desc',
  });
  const rows = sortRows(TOURNAMENTS, sort, TOURNAMENT_SORT);

  return (
    <Panel>
      <SectionHeader icon={Trophy} title="Tournaments" meta="3 tournaments" />
      <DataTable aria-label="Tournaments">
        <DataTableHeader>
          <DataTableRow>
            <SortableHeader
              sortKey="name"
              sort={sort}
              onSortChange={setSort}
              defaultDirection="asc"
            >
              Tournament
            </SortableHeader>
            <DataTableHead showFrom="sm">Dates</DataTableHead>
            <SortableHeader
              sortKey="players"
              sort={sort}
              onSortChange={setSort}
              numeric
              showFrom="sm"
              info="Players with at least one verified score."
            >
              Players
            </SortableHeader>
            <SortableHeader
              sortKey="matches"
              sort={sort}
              onSortChange={setSort}
              numeric
            >
              Matches
            </SortableHeader>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => (
            <DataTableRow key={row.id}>
              <DataTableCell className="max-w-56">
                <EntityLink href={here('tables-sortable-header')}>
                  {row.name}
                </EntityLink>
              </DataTableCell>
              <DataTableCell muted showFrom="sm">
                <DateRangeText start={row.start} end={row.end} />
              </DataTableCell>
              <DataTableCell numeric showFrom="sm">
                {formatCount(row.players)}
              </DataTableCell>
              <DataTableCell numeric>{formatCount(row.matches)}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </Panel>
  );
}

// Whole-row links -------------------------------------------------------------

const POOL = [
  {
    id: 1,
    slot: 'NM1',
    title: 'Hotohashiru',
    diff: 'Extra',
    artist: 'ORESAMA',
    mapper: 'Meg',
    sr: '5.63',
    bpm: 140,
    length: '3:48',
    games: 330,
  },
  {
    id: 2,
    slot: 'HD1',
    title: 'sense',
    diff: "LC's Insane",
    artist: 'Mami Kawada',
    mapper: 'La Cataline',
    sr: '4.50',
    bpm: 168,
    length: '3:59',
    games: 314,
  },
  {
    id: 3,
    slot: 'DT1',
    title: 'Nostalgic Blood of the Strife',
    diff: 'MAXIMUM',
    artist: 'Laur',
    mapper: 'Zelq',
    sr: '6.48',
    bpm: 240,
    length: '1:54',
    games: null,
  },
];

/** The cover a beatmap shows without its art: the gallery loads no covers. */
function PoolCover({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className="flex shrink-0">
      <BeatmapCover alt="" sizes="48px" className={className} />
    </span>
  );
}

function LinkRowDemo() {
  return (
    <Panel>
      <SectionHeader icon={Music2} title="Pooled beatmaps" meta="3 beatmaps" />
      <DataTable
        aria-label="Pooled beatmaps"
        fixed
        phoneRows={
          <PhoneRowList aria-label="Pooled beatmaps">
            {POOL.map((map) => (
              <PhoneRow
                key={map.id}
                href={here('tables-link-row')}
                linkLabel={`View ${map.artist} - ${map.title} [${map.diff}]`}
                rank={map.slot}
                title={
                  <span className="truncate" data-row-title>
                    {map.title}{' '}
                    <span className="font-normal text-muted-foreground">
                      [{map.diff}]
                    </span>
                  </span>
                }
                description={`${map.artist} · ${map.mapper} · ${map.sr} SR`}
                value={map.games === null ? null : formatCount(map.games)}
                valueDescription={map.games === null ? undefined : 'games'}
              />
            ))}
          </PhoneRowList>
        }
      >
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-16">Slot</DataTableHead>
            <DataTableHead>Beatmap</DataTableHead>
            <DataTableHead numeric className="w-16">
              SR
            </DataTableHead>
            <DataTableHead numeric showFrom="lg" className="w-16">
              BPM
            </DataTableHead>
            <DataTableHead numeric showFrom="lg" className="w-20">
              Length
            </DataTableHead>
            <DataTableHead numeric className="w-20">
              Games
            </DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {POOL.map((map) => (
            <DataTableLinkRow key={map.id}>
              <DataTableCell className="font-medium">{map.slot}</DataTableCell>
              <DataTableLinkCell
                href={here('tables-link-row')}
                label={`View ${map.artist} - ${map.title} [${map.diff}]`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <PoolCover className="h-7 w-12 rounded-md" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium" data-row-title>
                      {map.title}{' '}
                      <span className="font-normal text-muted-foreground">
                        [{map.diff}]
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {map.artist} · {map.mapper}
                    </span>
                  </span>
                </span>
              </DataTableLinkCell>
              <DataTableCell numeric>{map.sr}</DataTableCell>
              <DataTableCell numeric showFrom="lg">
                {formatCount(map.bpm)}
              </DataTableCell>
              <DataTableCell numeric showFrom="lg">
                {map.length}
              </DataTableCell>
              <DataTableCell numeric>{formatCount(map.games)}</DataTableCell>
            </DataTableLinkRow>
          ))}
        </DataTableBody>
      </DataTable>
    </Panel>
  );
}

// Entity links -----------------------------------------------------------------

function EntityLinkDemo() {
  return (
    <Panel>
      <RowList>
        <RowListItem
          title={
            <EntityLink
              href={here('tables-entity-link')}
              leading={<PlayerAvatar name="Accolibed" size={32} />}
            >
              Accolibed
            </EntityLink>
          }
          description="Player: the avatar sits inside the name's link"
        />
        <RowListItem
          title={
            <EntityLink
              href={here('tables-entity-link')}
              leading={
                <BeatmapCover
                  alt=""
                  sizes="56px"
                  className="h-8 w-14 rounded-md"
                />
              }
            >
              Hotohashiru [Extra]
            </EntityLink>
          }
          description="Beatmap: the cover sits inside the same link"
        />
        <RowListItem
          title={
            <EntityLink href={here('tables-entity-link')}>
              Corsace Open 2025
            </EntityLink>
          }
          description="Tournament: no image, the name alone"
        />
      </RowList>
    </Panel>
  );
}

// Reports and the View button ------------------------------------------------

type ReportRow = {
  id: number;
  type: string;
  entity: string;
  reason: string;
  status: ReportStatus;
  created: string;
  unread: boolean;
  details: string;
};

const REPORTS: ReportRow[] = [
  {
    id: 1204,
    type: 'Match',
    entity: 'CO25: (Lunar Lobster) vs (Team Rocket)',
    reason: 'Wrong winner',
    status: ReportStatus.Pending,
    created: '2025-10-12T18:42:00Z',
    unread: true,
    details:
      'Game 4 was replayed after a disconnect; the first attempt counts.',
  },
  {
    id: 1187,
    type: 'Tournament',
    entity: 'Break The Meta Cup',
    reason: 'Wrong rank range',
    status: ReportStatus.Approved,
    created: '2025-10-03T09:15:00Z',
    unread: false,
    details: 'The forum post lists a 10,000+ rank range, not open rank.',
  },
  {
    id: 1162,
    type: 'Score',
    entity: 'Score 4012345',
    reason: 'Not a tournament score',
    status: ReportStatus.Rejected,
    created: '2025-09-28T21:03:00Z',
    unread: false,
    details: 'This score came from a warmup map.',
  },
];

/**
 * The View button and its report dialog, in the one dialog layout. As the
 * dialog's trigger, the button gets focus back when the dialog closes.
 */
function ReportView({ report }: { report: ReportRow }) {
  return (
    <DialogTemplate
      trigger={<ViewButton subject={`report ${formatId(report.id)}`} />}
      title={`Report ${formatId(report.id)}`}
      description={
        <>
          {report.type} · <Timestamp date={report.created} />
        </>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2 text-sm">
        <dt>
          <Eyebrow>Entity</Eyebrow>
        </dt>
        <dd>{report.entity}</dd>
        <dt>
          <Eyebrow>Reason</Eyebrow>
        </dt>
        <dd>{report.reason}</dd>
        <dt>
          <Eyebrow>Status</Eyebrow>
        </dt>
        <dd>
          <ReportStatusBadge status={report.status} size="sm" />
        </dd>
        <dt>
          <Eyebrow>Details</Eyebrow>
        </dt>
        <dd>{report.details}</dd>
      </dl>
    </DialogTemplate>
  );
}

function ReportsDemo() {
  return (
    <Panel>
      <SectionHeader icon={Flag} title="My reports" meta="3 reports" />
      <DataTable
        aria-label="My reports"
        phoneRows={
          <PhoneRowList aria-label="My reports">
            {REPORTS.map((report) => (
              <PhoneRow
                key={report.id}
                title={
                  <>
                    {report.unread ? (
                      <NotificationDot label="Unread admin update" />
                    ) : null}
                    <EntityLink href={here('tables-view-button')}>
                      {report.entity}
                    </EntityLink>
                  </>
                }
                description={
                  <span className="flex min-w-0 items-center gap-1.5">
                    <ReportStatusBadge status={report.status} size="sm" />
                    <span className="truncate">{report.reason}</span>
                  </span>
                }
                value={<ReportView report={report} />}
              />
            ))}
          </PhoneRowList>
        }
      >
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead className="w-8">
              <span className="sr-only">Unread</span>
            </DataTableHead>
            <DataTableHead>Entity</DataTableHead>
            <DataTableHead>Reason</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead showFrom="lg">Submitted</DataTableHead>
            <DataTableHead align="end">
              <span className="sr-only">Actions</span>
            </DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {REPORTS.map((report) => (
            <DataTableRow key={report.id}>
              <DataTableCell empty={false}>
                {report.unread ? (
                  <NotificationDot label="Unread admin update" />
                ) : null}
              </DataTableCell>
              <DataTableCell className="max-w-56">
                <span className="block text-xs text-muted-foreground">
                  {report.type}
                </span>
                <EntityLink href={here('tables-view-button')}>
                  {report.entity}
                </EntityLink>
              </DataTableCell>
              <DataTableCell>{report.reason}</DataTableCell>
              <DataTableCell>
                <ReportStatusBadge status={report.status} size="sm" />
              </DataTableCell>
              <DataTableCell muted showFrom="lg">
                <DateText date={report.created} />
              </DataTableCell>
              <DataTableCell align="end">
                <ReportView report={report} />
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </Panel>
  );
}

// Phone rows -------------------------------------------------------------------

const PHONE_TOURNAMENTS = [
  {
    id: 1,
    name: 'Corsace Open 2025',
    format: 'osu! · 4v4 · Open rank',
    matches: 412,
  },
  {
    id: 2,
    name: 'Break The Meta Cup',
    format: 'osu! · 1v1 · 10,000+',
    matches: 96,
  },
  {
    id: 3,
    name: 'Taiko Classic 2025',
    format: 'taiko · 2v2 · Open rank',
    matches: null,
  },
];

function PhoneRowsDemo() {
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <Panel>
        <SectionHeader icon={ListOrdered} title="Leaderboard" />
        <PhoneRowList as="ol" aria-label="Leaderboard">
          {LEADERBOARD.slice(0, 4).map((row) => (
            <PhoneRow
              key={row.id}
              rank={formatRank(row.rank)}
              title={<PlayerName row={row} />}
              description={playerSummary(row)}
              valueAdornment={
                <TierMark tier={row.tier} subTier={row.subTier} size={22} />
              }
              value={formatRating(row.rating)}
            />
          ))}
        </PhoneRowList>
      </Panel>
      <Panel>
        <SectionHeader icon={Trophy} title="Tournaments" />
        <PhoneRowList aria-label="Tournaments">
          {PHONE_TOURNAMENTS.map((tournament) => (
            <PhoneRow
              key={tournament.id}
              href={here('tables-phone-rows')}
              linkLabel={`View ${tournament.name}`}
              title={
                <span className="truncate" data-row-title>
                  {tournament.name}
                </span>
              }
              description={tournament.format}
              value={
                tournament.matches === null
                  ? null
                  : formatCount(tournament.matches)
              }
              valueDescription={
                tournament.matches === null ? undefined : 'matches'
              }
            />
          ))}
        </PhoneRowList>
      </Panel>
    </div>
  );
}

// Paging -------------------------------------------------------------------------

const RESULTS = [
  { name: 'Corsace Open 2025', format: 'osu! · 4v4 · Open rank' },
  { name: 'osu! World Cup 2025', format: 'osu! · 4v4 · Open rank' },
  { name: 'Break The Meta Cup', format: 'osu! · 1v1 · 10,000+' },
];
const TOURNAMENT_COUNT = 1284;

function PaginationDemo() {
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader
          icon={Trophy}
          title="Tournaments"
          meta={formatCountOf(TOURNAMENT_COUNT, 'tournament')}
        />
        <RowList>
          {RESULTS.map((result) => (
            <RowListItem
              key={result.name}
              title={
                <EntityLink href={here('tables-pagination')}>
                  {result.name}
                </EntityLink>
              }
              description={result.format}
            />
          ))}
        </RowList>
        <PaginationFooter
          page={page}
          pageSize={50}
          totalCount={TOURNAMENT_COUNT}
          onPageChange={setPage}
          label="Tournament pages"
        />
      </Panel>
      <Panel>
        <PaginationFooter
          className="border-t-0"
          page={13}
          pageSize={50}
          totalCount={TOURNAMENT_COUNT}
          getPageHref={(target) => `?page=${target}#tables-pagination`}
          label="Pages, as links"
        />
      </Panel>
      <Panel>
        <PaginationFooter
          className="border-t-0"
          page={26}
          pageSize={50}
          totalCount={TOURNAMENT_COUNT}
          getPageHref={(target) => `?page=${target}#tables-pagination`}
          label="Last page"
        />
      </Panel>
    </div>
  );
}

const EVENTS = [
  'Stage verified Corsace Open 2025',
  'Stage edited the rank range of Break The Meta Cup',
  'Automated checks pre-verified 412 matches',
  'Yasui reported a score in osu! World Cup 2025',
  'Stage rejected game 4 of CO25: (Lunar Lobster) vs (Team Rocket)',
  'distantmemory submitted Taiko Classic 2025',
  'Automated checks pre-rejected 3 games',
  'Stage confirmed report 1187',
  'Stage merged two matches',
  'Stage edited the forum post of Corsace Open 2025',
  'Automated checks pre-verified 96 matches',
  'mrekk submitted Break The Meta Cup',
];
const EVENT_BATCH = 5;

function LoadMoreDemo() {
  const [shown, setShown] = useState(EVENT_BATCH);
  const [loading, setLoading] = useState(false);

  return (
    <Panel>
      <SectionHeader icon={Activity} title="Recent activity" />
      <RowList>
        {EVENTS.slice(0, shown).map((event) => (
          <RowListItem key={event} className="py-2.5 text-sm">
            {event}
          </RowListItem>
        ))}
      </RowList>
      <LoadMore
        hasMore={shown < EVENTS.length}
        loading={loading}
        shownCount={shown}
        totalCount={EVENTS.length}
        onLoadMore={() => {
          setLoading(true);
          window.setTimeout(() => {
            setShown((count) => Math.min(EVENTS.length, count + EVENT_BATCH));
            setLoading(false);
          }, 600);
        }}
      />
    </Panel>
  );
}

// Sticky header -----------------------------------------------------------------

/** One player's osu! rating after each tournament, newest first. */
const RATING_HISTORY = [
  { tournament: 'osu! World Cup 2025', date: '2025-12-14', matches: 9 },
  { tournament: 'Corsace Open 2025', date: '2025-10-19', matches: 7 },
  { tournament: 'osu! World Cup 2024', date: '2024-12-15', matches: 11 },
  { tournament: 'Corsace Open 2024', date: '2024-10-20', matches: 6 },
  { tournament: 'osu! World Cup 2023', date: '2023-12-17', matches: 8 },
  { tournament: 'Corsace Open 2023', date: '2023-10-22', matches: 5 },
  { tournament: 'osu! World Cup 2022', date: '2022-12-18', matches: 10 },
  { tournament: 'Corsace Open 2022', date: '2022-10-23', matches: 4 },
].map((event, index) => ({
  ...event,
  id: index,
  rating: 2615.3 - index * 41.7,
}));

function StickyHeaderDemo() {
  return (
    <Panel>
      <SectionHeader
        icon={History}
        title="Rating history"
        meta={formatCountOf(RATING_HISTORY.length, 'tournament')}
      />
      {/* Focusable so the box scrolls by keyboard. */}
      <div
        tabIndex={0}
        className="max-h-72 overflow-y-auto focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
      >
        <DataTable aria-label="Rating history" stickyHeader="scroll-area">
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead>Tournament</DataTableHead>
              <DataTableHead showFrom="sm">Date</DataTableHead>
              <DataTableHead numeric>Matches</DataTableHead>
              <DataTableHead numeric>Rating</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {RATING_HISTORY.map((event) => (
              <DataTableRow key={event.id}>
                <DataTableCell>
                  <EntityLink href={here('tables-sticky-header')}>
                    {event.tournament}
                  </EntityLink>
                </DataTableCell>
                <DataTableCell muted showFrom="sm">
                  <DateText date={event.date} />
                </DataTableCell>
                <DataTableCell numeric>
                  {formatCount(event.matches)}
                </DataTableCell>
                <DataTableCell numeric className="font-semibold">
                  {formatRating(event.rating)}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>
    </Panel>
  );
}

const SCORES = [
  {
    id: 1,
    player: 'lifeline',
    score: 1204512,
    accuracy: 0.9854,
    played: '2025-10-04',
  },
  {
    id: 2,
    player: 'Raikouhou',
    score: 1187003,
    accuracy: null,
    played: '2025-09-27',
  },
  { id: 3, player: 'Yasui', score: 1011245, accuracy: 0.9612, played: null },
];

function MissingValueDemo() {
  return (
    <Panel>
      <DataTable aria-label="Top scores">
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead>Player</DataTableHead>
            <DataTableHead numeric>Score</DataTableHead>
            <DataTableHead numeric showFrom="sm">
              Accuracy
            </DataTableHead>
            <DataTableHead align="end">Played</DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {SCORES.map((score) => (
            <DataTableRow key={score.id}>
              <DataTableCell>
                <EntityLink
                  href={here('tables-missing-value')}
                  leading={<PlayerAvatar name={score.player} />}
                >
                  {score.player}
                </EntityLink>
              </DataTableCell>
              <DataTableCell numeric className="font-semibold">
                {formatCount(score.score)}
              </DataTableCell>
              <DataTableCell numeric muted showFrom="sm">
                {formatAccuracy(score.accuracy)}
              </DataTableCell>
              <DataTableCell align="end" muted>
                {score.played ? <DateText date={score.played} /> : null}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      <p className="border-t px-4 py-3 text-sm">
        Peak rating: <MissingValue label="No peak rating yet" />
      </p>
    </Panel>
  );
}

export default function TablesSection() {
  return (
    <GallerySection
      id="tables"
      title="Tables, rows and paging"
      description="Table styles, rows on phones, pagination and row actions."
    >
      <Specimen
        id="tables-data-table"
        name="DataTable"
        importPath={`${KIT}/DataTable`}
        description="The one table style: muted 12px headers on a tinted strip, right-aligned numbers, no stripes, edge to edge in its panel. This one has sortable columns, numbered pages and phone rows below tablet width; only the names link, so rows get no hover tint."
        stacked
      >
        <LeaderboardDemo />
      </Specimen>

      <Specimen
        id="tables-sticky-header"
        name="Sticky header"
        importPath={`${KIT}/DataTable`}
        description='Long tables keep their header in view. On a page, stickyHeader pins it under the site header from tablet width; inside a scrolling box, such as a dialog, stickyHeader="scroll-area" pins it to the box. Scroll this one.'
      >
        <StickyHeaderDemo />
      </Specimen>

      <Specimen
        id="tables-sortable-header"
        name="SortableHeader"
        importPath={`${KIT}/SortableHeader`}
        stacked
        description="A column header that sorts. It shares its { key, direction } state with the toolbar's sort control; the sorted column shows its arrow, and numeric columns lead with the arrow so the label lines up with the numbers."
      >
        <SortableHeaderDemo />
      </Specimen>

      <Specimen
        id="tables-link-row"
        name="DataTableLinkRow and DataTableLinkCell"
        importPath={`${KIT}/DataTableLinkRow`}
        description="Only for tables whose rows already open as a whole: the beatmap list and pooled beatmaps. The row gets the hover tint and the name turns blue; a click anywhere follows the one link in the name cell. Below tablet width the rows become PhoneRows that link as a whole."
        stacked
      >
        <LinkRowDemo />
      </Specimen>

      <Specimen
        id="tables-entity-link"
        name="EntityLink"
        importPath={`${KIT}/EntityLink`}
        description="The name as a link, with its avatar or cover inside the same link: one link per destination. Use it wherever only the name opens the entity."
      >
        <EntityLinkDemo />
      </Specimen>

      <Specimen
        id="tables-view-button"
        name="ViewButton"
        importPath={`${KIT}/ViewButton`}
        description="A labelled View button that opens a report in a modal, on My reports and the admin queue. The row is not clickable; its entity link still works on its own."
        stacked
      >
        <ReportsDemo />
      </Specimen>

      <Specimen
        id="tables-phone-rows"
        name="PhoneRowList and PhoneRow"
        importPath={`${KIT}/PhoneRow`}
        description="What a table becomes below tablet width: rank, name with avatar and flag, one muted line, and the key number on the right with the tier icon 4px to its left. Nothing scrolls sideways. Whole-row links only where the rows already open as a whole."
      >
        <PhoneRowsDemo />
      </Specimen>

      <Specimen
        id="tables-pagination"
        name="PaginationFooter"
        importPath={`${KIT}/PaginationFooter`}
        stacked
        description="Numbered pages in the panel's footer with a 1–50 of 1,284 readout, for every searchable list. A footer narrower than 36rem keeps only the arrows and the page count. Links for lists paged in the address, buttons for lists paged in state."
      >
        <PaginationDemo />
      </Specimen>

      <Specimen
        id="tables-load-more"
        name="LoadMore"
        importPath={`${KIT}/LoadMore`}
        description="Only for activity feeds, such as the audit log: a count and a Load more button that appends the next batch, then a note once everything is showing."
      >
        <LoadMoreDemo />
      </Specimen>

      <Specimen
        id="tables-missing-value"
        name="MissingValue"
        importPath={`${KIT}/MissingValue`}
        description="A muted em dash for a missing value, read as “No value”. Table cells and phone rows render it for null, empty and the formatters' dash; use it directly elsewhere."
      >
        <MissingValueDemo />
      </Specimen>
    </GallerySection>
  );
}
