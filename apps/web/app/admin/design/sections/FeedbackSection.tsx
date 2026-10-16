'use client';

import { ReportStatus, Ruleset } from '@otr/core/osu';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ChartNoAxesColumn,
  Compass,
  Flag,
  Gauge,
  History,
  Lock,
  Music,
  RefreshCw,
  ShieldAlert,
  ShieldQuestion,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { GallerySection, Specimen } from '../gallery';
import SectionError from '@/components/error/SectionError';
import { Button } from '@/components/kit/controls/Button';
import { Callout } from '@/components/kit/feedback/Callout';
import { CalloutChip } from '@/components/kit/feedback/CalloutChip';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  RowListSkeleton,
  SectionHeaderSkeleton,
  StatTileGridSkeleton,
  TableSkeleton,
  type TableSkeletonColumn,
} from '@/components/kit/feedback/Skeletons';
import { StatusPage } from '@/components/kit/feedback/StatusPage';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { RowList, RowListItem } from '@/components/kit/layout/RowList';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { StatTile, StatTileGrid } from '@/components/kit/layout/StatTile';
import { typeScale } from '@/components/kit/layout/Typography';
import { ReportStatusBadge } from '@/components/kit/status/ReportStatusBadge';
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
import { ListToolbar } from '@/components/kit/lists/ListToolbar';
import { RulesetChips } from '@/components/kit/lists/RulesetChips';
import { ScopeSwitch } from '@/components/kit/lists/ScopeSwitch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCountOf } from '@/lib/kit/format/number';

const KIT = '@/components/kit/feedback';

const TOURNAMENTS = [
  {
    name: 'Corsace Open 2025',
    ruleset: Ruleset.Osu,
    meta: 'osu! · 4v4 · Open rank',
    dates: 'Jul 20 – Aug 3, 2025',
  },
  {
    name: 'Oceania Taiko Cup 2026',
    ruleset: Ruleset.Taiko,
    meta: 'taiko · 2v2 · 10,000+',
    dates: 'Feb 7 – 28, 2026',
  },
  {
    name: 'Mania 4K World Cup 2026',
    ruleset: Ruleset.Mania4k,
    meta: 'mania 4K · 4v4 · Open rank',
    dates: 'Mar 14 – Apr 26, 2026',
  },
];

const ACTIVITY = [
  'Stage verified Corsace Open 2025',
  'Automated checks pre-verified 412 matches',
  'Raikouhou submitted Oceania Taiko Cup 2026',
];

const PLAYERS = [
  { name: 'distantmemory', country: 'United States', rating: '2,215' },
  { name: 'Raikouhou', country: 'Japan', rating: '2,108' },
  { name: 'Yasui', country: 'Japan', rating: '1,996' },
];

const OVERVIEW_LABELS = ['Rating', 'Global rank', 'Matches'];

const REPORT_COLUMNS: TableSkeletonColumn[] = [
  { label: 'Type', width: 'w-28' },
  { label: 'Entity' },
  { label: 'Reason', showFrom: 'lg' },
  { label: 'Status', width: 'w-32' },
  { label: 'Submitted', width: 'w-32', align: 'end' },
];

const REPORTS = [
  {
    id: 1204,
    type: 'Match',
    entity: 'CO25: (Lunar Lobster) vs (Team Rocket)',
    reason: 'Wrong winner',
    status: ReportStatus.Pending,
    submitted: 'Oct 12, 2025',
  },
  {
    id: 1187,
    type: 'Tournament',
    entity: 'Break The Meta Cup',
    reason: 'Wrong rank range',
    status: ReportStatus.Approved,
    submitted: 'Oct 3, 2025',
  },
  {
    id: 1162,
    type: 'Score',
    entity: 'Score 4012345',
    reason: 'Not a tournament score',
    status: ReportStatus.Rejected,
    submitted: 'Sep 28, 2025',
  },
];

/** Plays a retry: spins for a moment, then either loads or fails again. */
function useRetryDemo(succeed: boolean) {
  const [failed, setFailed] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return {
    failed,
    retrying,
    retry: () => {
      setRetrying(true);
      timer.current = setTimeout(() => {
        setRetrying(false);
        if (succeed) setFailed(false);
      }, 1200);
    },
    fail: () => setFailed(true),
  };
}

function PlayerAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-8">
      <AvatarFallback className="text-xs font-medium">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function TournamentRows({
  tournaments = TOURNAMENTS,
}: {
  tournaments?: typeof TOURNAMENTS;
}) {
  return (
    <RowList>
      {tournaments.map((tournament) => (
        <RowListItem
          key={tournament.name}
          title={
            <EntityLink href="#feedback-empty-state-filtered">
              {tournament.name}
            </EntityLink>
          }
          description={tournament.meta}
          trailing={<span className={typeScale.meta}>{tournament.dates}</span>}
        />
      ))}
    </RowList>
  );
}

/** Flips a specimen between its skeleton and its loaded state. */
function LoadToggle({
  loading,
  onChange,
}: {
  loading: boolean;
  onChange: (loading: boolean) => void;
}) {
  return (
    <ScopeSwitch
      label="Specimen state"
      value={loading ? 'loading' : 'loaded'}
      onValueChange={(next) => onChange(next === 'loading')}
      options={[
        { value: 'loading', label: 'Loading' },
        { value: 'loaded', label: 'Loaded' },
      ]}
      className="w-fit"
    />
  );
}

/** A filterable list's panel: its toolbar, then the rows or the empty state. */
function FilteredEmptyDemo() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([Ruleset.Mania7k]);
  const shown = TOURNAMENTS.filter(
    (tournament) =>
      rulesets.length === 0 || rulesets.includes(tournament.ruleset)
  );

  return (
    <Panel>
      <ListToolbar
        label="Filter tournaments"
        rulesets={<RulesetChips value={rulesets} onValueChange={setRulesets} />}
        count={formatCountOf(shown.length, 'tournament')}
      />
      {shown.length === 0 ? (
        <EmptyState
          title="No tournaments match"
          description="Try a different name, ruleset, or fewer filters."
          clearFilters={{ onClick: () => setRulesets([]) }}
        />
      ) : (
        <TournamentRows tournaments={shown} />
      )}
    </Panel>
  );
}

function RegularErrorDemo() {
  const { failed, retrying, retry, fail } = useRetryDemo(true);

  return (
    <Panel>
      <SectionHeader
        icon={Trophy}
        title="Tournament history"
        meta={failed ? undefined : '3 tournaments'}
        actions={
          failed ? null : (
            <Button size="sm" variant="outline" onClick={fail}>
              Fail again
            </Button>
          )
        }
      />
      {failed ? (
        <SectionError
          title="Tournament history could not load"
          retrying={retrying}
          onRetry={retry}
        />
      ) : (
        <TournamentRows />
      )}
    </Panel>
  );
}

function CompactErrorDemo() {
  const { retrying, retry } = useRetryDemo(false);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Panel>
        <SectionHeader icon={History} title="Rating history" />
        <SectionError
          size="compact"
          title="Rating history could not load"
          retrying={retrying}
          onRetry={retry}
        />
      </Panel>
      <Panel>
        <SectionHeader icon={ChartNoAxesColumn} title="Score distribution" />
        <EmptyState
          size="compact"
          icon={ChartNoAxesColumn}
          title="Not enough data"
          description="The chart appears once 10 scores are verified."
        />
      </Panel>
    </div>
  );
}

function InlineErrorDemo() {
  const list = useRetryDemo(false);
  const row = useRetryDemo(false);
  const field = useRetryDemo(false);

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionHeader icon={Activity} title="Recent activity" />
        <RowList>
          {ACTIVITY.map((event) => (
            <RowListItem key={event} className="py-2.5 text-sm">
              {event}
            </RowListItem>
          ))}
        </RowList>
        <div className="border-t px-4 py-4">
          <SectionError
            size="inline"
            title="More activity could not load"
            retrying={list.retrying}
            onRetry={list.retry}
            className="justify-center"
          />
        </div>
      </Panel>
      <Panel>
        <SectionHeader icon={History} title="Audit history" />
        <div className="flex flex-col gap-2 px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">Stage</span> rejected 9 matches
          </p>
          <SectionError
            size="inline"
            title="Affected matches could not load"
            retrying={row.retrying}
            onRetry={row.retry}
          />
        </div>
      </Panel>
      <Panel>
        <SectionHeader icon={Flag} title="Report a problem" />
        <PanelBody className="flex flex-col gap-2">
          <span className="text-sm font-medium">Reason</span>
          <SectionError
            size="inline"
            title="Report reasons could not load"
            retrying={field.retrying}
            onRetry={field.retry}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

function OverviewSkeletonDemo() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <LoadToggle loading={loading} onChange={setLoading} />
      {loading ? (
        <PanelSkeleton label="Loading overview">
          <SectionHeaderSkeleton icon={Gauge} title="Overview" />
          <PanelBody>
            <StatTileGridSkeleton labels={OVERVIEW_LABELS} sub />
          </PanelBody>
        </PanelSkeleton>
      ) : (
        <Panel>
          <SectionHeader icon={Gauge} title="Overview" meta="osu!" />
          <PanelBody>
            <StatTileGrid columns={3}>
              <StatTile label="Rating" value="1,835" sub="Peak 1,902" />
              <StatTile
                label="Global rank"
                value="#1,024"
                sub="98th percentile"
              />
              <StatTile label="Matches" value="312" sub="58.3% won" />
            </StatTileGrid>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}

function RowsSkeletonDemo() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <LoadToggle loading={loading} onChange={setLoading} />
      {loading ? (
        <PanelSkeleton label="Loading teammates">
          <SectionHeaderSkeleton icon={Users} title="Teammates" />
          <RowListSkeleton rows={3} />
        </PanelSkeleton>
      ) : (
        <Panel>
          <SectionHeader icon={Users} title="Teammates" meta="3 players" />
          <RowList>
            {PLAYERS.map((player) => (
              <RowListItem
                key={player.name}
                leading={<PlayerAvatar name={player.name} />}
                title={player.name}
                description={player.country}
                trailing={
                  <span className="font-semibold">{player.rating}</span>
                }
              />
            ))}
          </RowList>
        </Panel>
      )}
    </div>
  );
}

function TableSkeletonDemo() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <LoadToggle loading={loading} onChange={setLoading} />
      {loading ? (
        <PanelSkeleton label="Loading reports">
          <SectionHeaderSkeleton icon={Flag} title="Reports" />
          <TableSkeleton
            columns={REPORT_COLUMNS}
            rows={REPORTS.length}
            phoneRows={<PhoneRowListSkeleton rows={REPORTS.length} />}
          />
        </PanelSkeleton>
      ) : (
        <Panel>
          <SectionHeader icon={Flag} title="Reports" meta="3 reports" />
          <DataTable
            fixed
            aria-label="Reports"
            phoneRows={
              <PhoneRowList aria-label="Reports">
                {REPORTS.map((report) => (
                  <PhoneRow
                    key={report.id}
                    title={
                      <EntityLink href="#feedback-skeleton-table">
                        {report.entity}
                      </EntityLink>
                    }
                    description={`${report.type} · ${report.reason}`}
                    value={
                      <ReportStatusBadge status={report.status} size="sm" />
                    }
                  />
                ))}
              </PhoneRowList>
            }
          >
            <DataTableHeader>
              <DataTableRow>
                {REPORT_COLUMNS.map((column) => (
                  <DataTableHead
                    key={column.label}
                    align={column.align}
                    showFrom={column.showFrom}
                    className={column.width}
                  >
                    {column.label}
                  </DataTableHead>
                ))}
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {REPORTS.map((report) => (
                <DataTableRow key={report.id}>
                  <DataTableCell>{report.type}</DataTableCell>
                  <DataTableCell>
                    <EntityLink href="#feedback-skeleton-table">
                      {report.entity}
                    </EntityLink>
                  </DataTableCell>
                  <DataTableCell showFrom="lg">{report.reason}</DataTableCell>
                  <DataTableCell>
                    <ReportStatusBadge status={report.status} />
                  </DataTableCell>
                  <DataTableCell align="end" muted>
                    {report.submitted}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Panel>
      )}
    </div>
  );
}

function NotFoundBackground() {
  return (
    <Image
      src="/images/error-background.svg"
      alt=""
      fill
      sizes="100vw"
      className="object-contain object-top sm:object-cover sm:object-center"
    />
  );
}

export default function FeedbackSection() {
  return (
    <GallerySection
      id="feedback"
      title="Empty, error and notices"
      description="Empty and error states, loading skeletons, status pages and callouts. The info button is under layout."
    >
      <Specimen
        id="feedback-empty-state"
        name="EmptyState"
        importPath={`${KIT}/EmptyState`}
        description="Takes the place of a list, table or chart with nothing to show, in the section error's frame with a neutral icon. Say what is missing, then why."
      >
        <Panel>
          <SectionHeader icon={Music} title="Pooled beatmaps" />
          <EmptyState
            icon={Music}
            title="No pooled beatmaps"
            description="No beatmaps by this player have been pooled in a tracked tournament."
          />
        </Panel>
      </Specimen>

      <Specimen
        id="feedback-empty-state-filtered"
        name="EmptyState with Clear filters"
        importPath={`${KIT}/EmptyState`}
        description="When the visitor's filters emptied the list, add Clear filters. It clears filters only, never the search, sort or tab. Try it."
      >
        <FilteredEmptyDemo />
      </Specimen>

      <Specimen
        id="feedback-empty-state-compact"
        name="Compact EmptyState and SectionError"
        importPath={`${KIT}/EmptyState`}
        description="The compact size fits a chart, a small panel or a dialog. Like the regular size it sits straight under the SectionHeader or ListToolbar, and the compact error and empty state share one frame, so a panel looks the same whichever happens."
      >
        <CompactErrorDemo />
      </Specimen>

      <Specimen
        id="feedback-section-error"
        name="SectionError"
        importPath="@/components/error/SectionError"
        description="Takes the place of a section whose data failed to load, so a failure never reads as an empty list. Try again spins while the request runs."
      >
        <RegularErrorDemo />
      </Specimen>

      <Specimen
        id="feedback-section-error-inline"
        name="SectionError, inline"
        importPath="@/components/error/SectionError"
        description="The inline size is one line with Try again beside it, for a failure inside a list, an expanded row or a form field. It replaces the hand-built Retry rows."
      >
        <InlineErrorDemo />
      </Specimen>

      <Specimen
        id="feedback-skeleton-panel"
        name="PanelSkeleton, SectionHeaderSkeleton and StatTileGridSkeleton"
        importPath={`${KIT}/Skeletons`}
        description="Loading screens are built from the same panels as the page, with the real static titles, so nothing shifts when the data arrives. Switch between the two states."
      >
        <div className="flex flex-col gap-4">
          <OverviewSkeletonDemo />
          <PanelSkeleton className="h-56" />
        </div>
      </Specimen>

      <Specimen
        id="feedback-skeleton-table"
        name="TableSkeleton and PhoneRowListSkeleton"
        importPath={`${KIT}/Skeletons`}
        description="A DataTable while it loads: the real header strip and the loaded table's columns. Below tablet width it shows phone rows, as the loaded table does. Switch between the two states."
        stacked
      >
        <TableSkeletonDemo />
      </Specimen>

      <Specimen
        id="feedback-skeleton-rows"
        name="RowListSkeleton"
        importPath={`${KIT}/Skeletons`}
        description="RowList rows while a list loads: leading avatar, cover or nothing, a title and detail line, and the key number."
      >
        <RowsSkeletonDemo />
      </Specimen>

      <Specimen
        id="feedback-status-page"
        name="StatusPage"
        importPath={`${KIT}/StatusPage`}
        description="The one layout for not found, unauthorized, banned and error pages: icon, short heading, one sentence, one action. The 404 keeps its blurred background."
        stacked
      >
        <StatusPage
          icon={Compass}
          title="Page not found"
          description="This page does not exist or has moved."
          background={<NotFoundBackground />}
          action={
            <Button asChild>
              <a href="#feedback-status-page">Go to the home page</a>
            </Button>
          }
          className="min-h-80"
        />
      </Specimen>

      <Specimen
        id="feedback-status-page-variants"
        name="StatusPage: unauthorized, banned and error"
        importPath={`${KIT}/StatusPage`}
        description="Neutral for pages the visitor cannot see, red for a ban or a failure. A ban adds its reason under the sentence; a route error may add a way back before Try again."
        stacked
      >
        <div className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <StatusPage
            icon={Lock}
            title="You can't view this page"
            description="Only admins can open this page."
            action={
              <Button asChild>
                <a href="#feedback-status-page-variants">Go to the home page</a>
              </Button>
            }
            className="min-h-0 py-10"
          />
          <StatusPage
            icon={ShieldAlert}
            tone="destructive"
            title="Account suspended"
            description="Contact the admins if you think this is a mistake."
            className="min-h-0 py-10"
          >
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span>{' '}
              Multi-accounting
            </p>
          </StatusPage>
          <StatusPage
            icon={AlertCircle}
            tone="destructive"
            title="Tournament could not load"
            description="Something went wrong on our side. Try again in a moment."
            role="alert"
            action={
              <>
                <Button asChild variant="outline" icon={ArrowLeft}>
                  <a href="#feedback-status-page-variants">Tournaments</a>
                </Button>
                <Button icon={RefreshCw}>Try again</Button>
              </>
            }
            className="min-h-0 py-10"
          />
        </div>
      </Specimen>

      <Specimen
        id="feedback-callout"
        name="Callout"
        importPath={`${KIT}/Callout`}
        description="The one notice box. Info for context, warning for something to check before acting, danger for something that cannot be undone. Each tone has its own glyph."
      >
        <div className="flex flex-col gap-3">
          <Callout tone="info" title="Ratings update weekly">
            New verified matches count from the next Tuesday update at 12:00
            UTC.
          </Callout>
          <Callout tone="warning" title="Host compliance">
            Get written permission from osu! support before filtering an
            officially supported tournament.{' '}
            <a href="#feedback-callout">Read the filtering rules</a>
          </Callout>
          <Callout tone="danger" title="Saving is permanent">
            This beatmap stops receiving osu! API updates for good. Nothing can
            undo it.
          </Callout>
          <Callout tone="info">
            Submitted tournaments count toward ratings once an admin verifies
            them.
          </Callout>
        </div>
      </Specimen>

      <Specimen
        id="feedback-callout-action"
        name="Callout with an action"
        importPath={`${KIT}/Callout`}
        description="One button or link sits on the right, and under the text on phones. A destructive action is the red-outlined destructive Button; solid red is only for the final confirm."
      >
        <div className="flex flex-col gap-3">
          <Callout
            tone="danger"
            action={
              <Button variant="destructive" size="sm" icon={Trash2}>
                Delete account
              </Button>
            }
          >
            Deleting your account removes your API keys and reports for good.
            Your player profile stays public.
          </Callout>
          <Callout
            tone="warning"
            title="Filtering is unavailable"
            action={
              <Button asChild variant="outline" size="sm">
                <a href="#feedback-callout-action">Rating FAQ</a>
              </Button>
            }
          >
            Ratings are recalculating. Check back after 12:15 UTC.
          </Callout>
        </div>
      </Specimen>

      <Specimen
        id="feedback-callout-banner"
        name="Callout, banner"
        importPath={`${KIT}/Callout`}
        description="The banner variant is the full-width strip under the site header, for site-wide notices such as the weekly maintenance window."
        stacked
      >
        <Callout tone="warning" variant="banner" role="status">
          Ratings are recalculating. The site may be slow until 12:15 UTC.
        </Callout>
      </Specimen>

      <Specimen
        id="feedback-callout-chip"
        name="CalloutChip"
        importPath={`${KIT}/CalloutChip`}
        description="A short warning inside a panel, in the callout's colours. Its detail opens on tap, hover and focus."
      >
        <Panel>
          <SectionHeader
            icon={ChartNoAxesColumn}
            title="Mod distribution"
            meta="1,368 scores"
            actions={
              <CalloutChip
                icon={ShieldQuestion}
                detail="Includes data that has not been verified"
              >
                Includes unverified
              </CalloutChip>
            }
          />
          <PanelBody className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CalloutChip tone="info">Verified only</CalloutChip>
              <CalloutChip tone="warning">Partial data</CalloutChip>
              <CalloutChip tone="danger">Includes rejected</CalloutChip>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CalloutChip tone="info" size="sm">
                Verified only
              </CalloutChip>
              <CalloutChip tone="warning" size="sm">
                Partial data
              </CalloutChip>
              <CalloutChip tone="danger" size="sm">
                Includes rejected
              </CalloutChip>
            </div>
          </PanelBody>
        </Panel>
      </Specimen>
    </GallerySection>
  );
}
