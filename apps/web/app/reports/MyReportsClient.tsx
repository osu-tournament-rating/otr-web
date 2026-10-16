'use client';

import { Flag } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import useSWR from 'swr';

import SectionError from '@/components/error/SectionError';
import { DialogTemplate } from '@/components/kit/controls/DialogTemplate';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { SkeletonText } from '@/components/kit/feedback/Skeletons';
import { DateText } from '@/components/kit/format/DateText';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
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
import { PaginationFooter } from '@/components/kit/tables/PaginationFooter';
import { PhoneRow, PhoneRowList } from '@/components/kit/tables/PhoneRow';
import { ViewButton } from '@/components/kit/tables/ViewButton';
import { ReportDetails } from '@/components/reports/ReportDetails';
import {
  ReportEntityCell,
  ReportEntityName,
} from '@/components/reports/ReportEntityName';
import {
  formatReportSubject,
  getReportEntityTypeName,
} from '@/components/reports/report-presentation';
import { notifyReportChange } from '@/lib/hooks/useReportCount';
import { formatCountOf } from '@/lib/kit/format/number';
import { useListState } from '@/lib/kit/lists/use-list-state';
import { clampPage, getTotalPages } from '@/lib/kit/tables/pagination';
import { orpc } from '@/lib/orpc/orpc';
import type { MyReport } from '@/lib/orpc/schema/report';

import { MY_REPORTS_COLUMNS as COLUMN } from './columns';
import { MY_REPORTS_PAGE_SIZE, MY_REPORTS_PARAMS } from './list-params';
import { MyReportsTableSkeleton } from './MyReportsFrame';

const UNREAD_LABEL = 'Unread admin update';

/**
 * The visitor's own reports, newest first, for everyone, admins included.
 * Each row opens its report from a labelled View button; the entity name
 * links to the entity on its own.
 */
export default function MyReportsClient() {
  const list = useListState(MY_REPORTS_PARAMS);
  const { data, error, isValidating, mutate } = useSWR(
    'my-reports',
    () => orpc.reports.listMine({}),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const reports = data?.reports ?? [];
  const totalPages = getTotalPages(reports.length, MY_REPORTS_PAGE_SIZE);
  const requestedPage = list.state.page;
  const page = clampPage(requestedPage, totalPages);
  const start = (page - 1) * MY_REPORTS_PAGE_SIZE;
  const pageReports = reports.slice(start, start + MY_REPORTS_PAGE_SIZE);

  // An old link to a page past the end shows the last page instead.
  const { setState } = list;
  useEffect(() => {
    if (data && requestedPage > totalPages) {
      setState({ page: totalPages }, { history: 'replace' });
    }
  }, [data, requestedPage, setState, totalPages]);

  const markViewed = useCallback(
    (report: MyReport) => {
      if (!report.hasUnreadUpdate) return;

      void mutate(
        (current) =>
          current && {
            ...current,
            reports: current.reports.map((item) =>
              item.id === report.id ? { ...item, hasUnreadUpdate: false } : item
            ),
          },
        { revalidate: false }
      );
      orpc.reports
        .markMineViewed({ reportId: report.id })
        .then(notifyReportChange)
        .catch((cause) => {
          console.error('[my-reports] failed to mark report viewed', cause);
        });
    },
    [mutate]
  );

  return (
    <Panel data-testid="my-reports-card">
      <SectionHeader
        title="Reports"
        meta={
          data ? (
            reports.length > 0 ? (
              formatCountOf(reports.length, 'report')
            ) : undefined
          ) : error ? undefined : (
            <SkeletonText className="h-3 w-20" />
          )
        }
      />
      {!data && error ? (
        <SectionError
          title="Your reports could not load"
          retrying={isValidating}
          onRetry={() => void mutate()}
        />
      ) : !data ? (
        <div role="status" aria-label="Loading reports">
          <MyReportsTableSkeleton />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No reports yet"
          description="You haven't submitted any reports."
          data-testid="my-reports-empty"
        />
      ) : (
        <>
          <DataTable
            fixed
            // Up to 50 rows a page, so the header stays in view.
            stickyHeader
            aria-label="Reports"
            data-testid="my-reports-list"
            phoneRows={
              <PhoneRowList aria-label="Reports">
                {pageReports.map((report) => (
                  <PhoneRow
                    key={report.id}
                    data-testid="my-reports-phone-row"
                    data-report-id={report.id}
                    // The View button belongs to the name's line.
                    align="start"
                    title={
                      <>
                        {report.hasUnreadUpdate ? (
                          <NotificationDot label={UNREAD_LABEL} />
                        ) : null}
                        <ReportEntityName report={report} />
                      </>
                    }
                    description={
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ReportStatusBadge status={report.status} size="sm" />
                        <span className="truncate">{report.reason.label}</span>
                      </span>
                    }
                    value={
                      <MyReportDialog report={report} onOpen={markViewed} />
                    }
                  />
                ))}
              </PhoneRowList>
            }
          >
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead className={COLUMN.unread.width}>
                  <span className="sr-only">Unread</span>
                </DataTableHead>
                <DataTableHead>{COLUMN.entity.label}</DataTableHead>
                <DataTableHead>{COLUMN.reason.label}</DataTableHead>
                <DataTableHead className={COLUMN.status.width}>
                  {COLUMN.status.label}
                </DataTableHead>
                <DataTableHead
                  className={COLUMN.submitted.width}
                  showFrom={COLUMN.submitted.showFrom}
                >
                  {COLUMN.submitted.label}
                </DataTableHead>
                <DataTableHead
                  className={COLUMN.view.width}
                  align={COLUMN.view.align}
                >
                  <span className="sr-only">Actions</span>
                </DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {pageReports.map((report) => (
                <DataTableRow
                  key={report.id}
                  data-testid="my-reports-row"
                  data-report-id={report.id}
                >
                  <DataTableCell empty={false}>
                    {report.hasUnreadUpdate ? (
                      <NotificationDot
                        label={UNREAD_LABEL}
                        data-testid="my-reports-unread-dot"
                      />
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    <ReportEntityCell report={report} />
                  </DataTableCell>
                  <DataTableCell>{report.reason.label}</DataTableCell>
                  <DataTableCell>
                    <ReportStatusBadge status={report.status} size="sm" />
                  </DataTableCell>
                  <DataTableCell muted showFrom={COLUMN.submitted.showFrom}>
                    <DateText date={report.created} />
                  </DataTableCell>
                  <DataTableCell align="end" empty={false}>
                    <MyReportDialog
                      report={report}
                      onOpen={markViewed}
                      viewTestId="my-reports-view-details"
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <PaginationFooter
            page={page}
            pageSize={MY_REPORTS_PAGE_SIZE}
            totalCount={reports.length}
            getPageHref={(target) => list.hrefFor({ page: target })}
            label="Report pages"
          />
        </>
      )}
    </Panel>
  );
}

/**
 * The View button and the report it opens. Opening a report with an unread
 * admin update marks it read.
 */
function MyReportDialog({
  report,
  onOpen,
  viewTestId,
}: {
  report: MyReport;
  onOpen: (report: MyReport) => void;
  viewTestId?: string;
}) {
  return (
    <DialogTemplate
      trigger={
        <ViewButton
          subject={formatReportSubject(report)}
          data-testid={viewTestId}
        />
      }
      title="Report details"
      description={`${getReportEntityTypeName(report.entityType)} · ${report.entityDisplayName}`}
      onOpenChange={(open) => {
        if (open) onOpen(report);
      }}
      data-testid="my-report-detail"
    >
      <ReportDetails report={report} />
    </DialogTemplate>
  );
}
