'use client';

import { ReportStatus } from '@otr/core/osu';
import { Flag } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';

import SectionError from '@/components/error/SectionError';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';
import { ScopeSwitch } from '@/components/kit/lists/ScopeSwitch';
import { SortControl } from '@/components/kit/lists/SortControl';
import { Panel } from '@/components/kit/layout/Panel';
import { ReportStatusBadge } from '@/components/kit/status/ReportStatusBadge';
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/kit/tables/DataTable';
import { DateText } from '@/components/kit/format/DateText';
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { SortableHeader } from '@/components/kit/tables/SortableHeader';
import { ViewButton } from '@/components/kit/tables/ViewButton';
import {
  ReportEntityCell,
  ReportEntityName,
} from '@/components/reports/ReportEntityName';
import { formatReportSubject } from '@/components/reports/report-presentation';
import { notifyReportChange } from '@/lib/hooks/useReportCount';
import { formatCountOf, formatId } from '@/lib/kit/format/number';
import { useListState } from '@/lib/kit/lists/use-list-state';
import {
  REPORT_STATUS_ORDER,
  getReportStatusCopy,
} from '@/lib/kit/status/report';
import { orpc } from '@/lib/orpc/orpc';
import type { Report, ReportListResponse } from '@/lib/orpc/schema/report';

import { AdminReportDialog, ReportUserName } from './AdminReportDialog';
import { AdminReportsTableSkeleton } from './AdminReportsFrame';
import {
  ADMIN_REPORTS_COLUMNS as COLUMN,
  ADMIN_REPORTS_PAGE_SIZE,
  ADMIN_REPORTS_PARAMS,
  ADMIN_REPORT_SORT_OPTIONS,
  toReportListInput,
} from './list-params';

type StatusScope = 'all' | `${ReportStatus}`;

const STATUS_OPTIONS: { value: StatusScope; label: string }[] = [
  { value: 'all', label: 'All' },
  ...REPORT_STATUS_ORDER.map((status) => ({
    value: String(status) as StatusScope,
    label: getReportStatusCopy(status).name,
  })),
];

/**
 * The admin report queue: every report, newest first, paged in the panel.
 * Status, sort and page live in the address. Each row opens its report from
 * a labelled View button into one shared dialog, where admins confirm,
 * dismiss or reopen it.
 */
export default function AdminReportsClient() {
  const list = useListState(ADMIN_REPORTS_PARAMS);
  const { state, setState } = list;
  const input = toReportListInput(state);

  const { data, error, isValidating, mutate } = useSWR(
    ['admin-reports', input],
    () => orpc.reports.list(input),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // Kept after the dialog closes, so it does not empty while it fades out.
  const [selected, setSelected] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    orpc.reports
      .markViewed({})
      .then(notifyReportChange)
      .catch((cause) => {
        console.error('[admin-reports] failed to mark reports viewed', cause);
      });
  }, []);

  // An old link to a page past the end shows the last page instead.
  useEffect(() => {
    if (data && data.totalPages > 0 && state.page > data.totalPages) {
      setState({ page: data.totalPages }, { history: 'replace' });
    }
  }, [data, setState, state.page]);

  const openReport = useCallback((report: Report) => {
    setSelected(report);
    setDialogOpen(true);
  }, []);

  const handleReportChange = useCallback(
    (updated: Report) => {
      setSelected(updated);
      void mutate(
        (current: ReportListResponse | undefined) =>
          current && {
            ...current,
            reports: current.reports.map((report) =>
              report.id === updated.id ? updated : report
            ),
          },
        { revalidate: false }
      );
    },
    [mutate]
  );

  const statusName =
    state.status === undefined
      ? undefined
      : getReportStatusCopy(state.status).name;
  const reports = data?.reports ?? [];
  // The date column shows the date the queue is sorted by.
  const dateColumn =
    state.sort.key === 'resolvedAt'
      ? { key: 'resolvedAt' as const, label: 'Reviewed' }
      : { key: 'created' as const, label: COLUMN.submitted.label };

  return (
    <>
      <Panel data-testid="admin-reports-card">
        <ListToolbar
          label="Sort and filter reports"
          sort={
            <SortControl
              label="Sort reports by"
              options={ADMIN_REPORT_SORT_OPTIONS}
              value={state.sort}
              onValueChange={(sort) => setState({ sort })}
            />
          }
          scope={
            <ScopeSwitch
              label="Status"
              data-testid="admin-reports-status-filter"
              value={
                state.status === undefined
                  ? 'all'
                  : (String(state.status) as StatusScope)
              }
              onValueChange={(value) =>
                setState({
                  status:
                    value === 'all'
                      ? undefined
                      : (Number(value) as ReportStatus),
                })
              }
              options={STATUS_OPTIONS}
            />
          }
          count={data ? formatCountOf(data.totalCount, 'report') : undefined}
        />

        {error && !data ? (
          <SectionError
            title="Reports could not load"
            retrying={isValidating}
            onRetry={() => void mutate()}
          />
        ) : !data ? (
          <div role="status" aria-label="Loading reports">
            <AdminReportsTableSkeleton />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={
              statusName
                ? `No ${statusName.toLowerCase()} reports`
                : 'No reports yet'
            }
            description={
              statusName
                ? 'Choose All to see reports in every state.'
                : undefined
            }
            data-testid="admin-reports-empty"
          />
        ) : (
          <>
            <DataTable
              fixed
              // Up to 50 rows a page, so the header stays in view.
              stickyHeader
              aria-label="Reports"
              data-testid="admin-reports-list"
              phoneRows={
                <PhoneRowList aria-label="Reports">
                  {reports.map((report) => (
                    <PhoneRow
                      key={report.id}
                      data-testid="admin-reports-phone-row"
                      data-report-id={report.id}
                      // The View button belongs to the name's line.
                      align="start"
                      title={<ReportEntityName report={report} />}
                      description={
                        <span className="flex min-w-0 items-center gap-1.5">
                          <ReportStatusBadge status={report.status} size="sm" />
                          <span className="truncate">
                            #{formatId(report.id)} · {report.reason.label}
                          </span>
                        </span>
                      }
                      value={
                        <ViewButton
                          subject={formatReportSubject(report)}
                          onClick={() => openReport(report)}
                        />
                      }
                    />
                  ))}
                </PhoneRowList>
              }
            >
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead className={COLUMN.id.width}>
                    {COLUMN.id.label}
                  </DataTableHead>
                  <DataTableHead>{COLUMN.entity.label}</DataTableHead>
                  <DataTableHead>{COLUMN.reason.label}</DataTableHead>
                  <DataTableHead
                    className={COLUMN.reporter.width}
                    showFrom={COLUMN.reporter.showFrom}
                  >
                    {COLUMN.reporter.label}
                  </DataTableHead>
                  <DataTableHead className={COLUMN.status.width}>
                    {COLUMN.status.label}
                  </DataTableHead>
                  <SortableHeader
                    sortKey={dateColumn.key}
                    sort={state.sort}
                    getSortHref={(sort) => list.hrefFor({ sort })}
                    className={COLUMN.submitted.width}
                    showFrom={COLUMN.submitted.showFrom}
                  >
                    {dateColumn.label}
                  </SortableHeader>
                  <DataTableHead
                    className={COLUMN.view.width}
                    align={COLUMN.view.align}
                  >
                    <span className="sr-only">Actions</span>
                  </DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {reports.map((report) => (
                  <DataTableRow
                    key={report.id}
                    data-testid="admin-reports-row"
                    data-report-id={report.id}
                  >
                    <DataTableCell className="text-muted-foreground tabular-nums">
                      {formatId(report.id)}
                    </DataTableCell>
                    <DataTableCell>
                      <ReportEntityCell
                        report={report}
                        data-testid="admin-reports-entity-link"
                      />
                    </DataTableCell>
                    <DataTableCell>{report.reason.label}</DataTableCell>
                    <DataTableCell showFrom={COLUMN.reporter.showFrom}>
                      <span className="block truncate">
                        <ReportUserName user={report.reporter} />
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <ReportStatusBadge status={report.status} size="sm" />
                    </DataTableCell>
                    <DataTableCell muted showFrom={COLUMN.submitted.showFrom}>
                      <DateText
                        date={
                          dateColumn.key === 'resolvedAt'
                            ? report.resolvedAt
                            : report.created
                        }
                      />
                    </DataTableCell>
                    <DataTableCell align="end" empty={false}>
                      <ViewButton
                        subject={formatReportSubject(report)}
                        data-testid="admin-reports-view-details"
                        onClick={() => openReport(report)}
                      />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <PaginationFooter
              page={state.page}
              pageSize={ADMIN_REPORTS_PAGE_SIZE}
              totalCount={data.totalCount}
              getPageHref={(page) => list.hrefFor({ page })}
              label="Report pages"
            />
          </>
        )}
      </Panel>

      <AdminReportDialog
        report={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onReportChange={handleReportChange}
      />
    </>
  );
}
