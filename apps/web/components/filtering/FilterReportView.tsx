'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { ClipboardCheck, FileText, ListFilter, Search } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ORPCError } from '@orpc/client';

import SectionError from '@/components/error/SectionError';
import { Button } from '@/components/kit/controls/Button';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import {
  PanelSkeleton,
  PhoneRowListSkeleton,
  SectionHeaderSkeleton,
  StatTileGridSkeleton,
  TableSkeleton,
} from '@/components/kit/feedback/Skeletons';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatId } from '@/lib/kit/format/number';
import { defineListParams, numberParam } from '@/lib/kit/lists/params';
import { useListState } from '@/lib/kit/lists/use-list-state';
import { orpc } from '@/lib/orpc/orpc';
import { cn } from '@/lib/utils';
import FilteringResultsTable from './FilteringResultsTable';
import FilterReportSummary from './FilterReportSummary';
import { csvDay, downloadFilterCsv } from './filterCsv';

/** The largest ID Postgres stores in an `integer` column. */
const MAX_REPORT_ID = 2_147_483_647;

/** The report on screen lives in the address: `/tools/filter-reports?report=12`. */
export const FILTER_REPORT_PARAMS = defineListParams({
  report: numberParam({
    min: 1,
    max: MAX_REPORT_ID,
    integer: true,
    role: 'scope',
  }),
});

const filterReportSchema = z.object({
  reportId: z
    .string()
    .trim()
    .min(1, 'Report ID is required')
    .regex(/^\d+$/, 'Report ID must be a number')
    .refine((value) => Number(value) >= 1, 'Report ID must be at least 1')
    .refine(
      (value) => Number(value) <= MAX_REPORT_ID,
      `Report ID cannot exceed ${MAX_REPORT_ID}`
    ),
});

type FilterReportForm = z.infer<typeof filterReportSchema>;

/** FilteringResultsTable's columns, for its loading rows. */
const RESULTS_SKELETON_COLUMNS = [
  { label: 'Status', width: 'w-28' },
  { label: 'Player' },
  { label: 'Failures' },
  { label: 'osu! ID', width: 'w-32', align: 'end' },
  { label: 'Rating', width: 'w-28', align: 'end' },
] as const;

/**
 * The summary and results panels while a report loads. The report's ID is
 * already in the address, so its title is real; bars stand in for the rest.
 */
function ReportSkeleton({ reportId }: { reportId: number }) {
  return (
    <>
      <PanelSkeleton label="Loading filter report">
        <SectionHeaderSkeleton
          icon={ClipboardCheck}
          title={`Filter report #${formatId(reportId)}`}
          // "Aug 6, 2026, 14:31 UTC", which fits beside the title on a phone.
          meta="w-32"
        />
        <PanelBody>
          <StatTileGridSkeleton
            columns={3}
            labels={[
              'Passed',
              'Failed',
              'Total players',
              'Ruleset',
              'Minimum rating',
              'Maximum rating',
            ]}
          />
        </PanelBody>
      </PanelSkeleton>
      <PanelSkeleton>
        <SectionHeaderSkeleton icon={ListFilter} title="Results" actions={1} />
        <TableSkeleton
          rows={4}
          columns={RESULTS_SKELETON_COLUMNS}
          phoneRows={<PhoneRowListSkeleton rows={4} leading={32} />}
        />
      </PanelSkeleton>
    </>
  );
}

/**
 * Looks up a stored filter report by its ID, kept in the address so a
 * report can be shared or reloaded, and shows its summary and results.
 */
export function FilterReportView() {
  const { state, setState } = useListState(FILTER_REPORT_PARAMS);
  const reportId = state.report;

  const form = useForm<FilterReportForm>({
    resolver: zodResolver(filterReportSchema),
    defaultValues: { reportId: reportId ? String(reportId) : '' },
  });

  // The back button or a link can change the report under the form.
  useEffect(() => {
    form.reset({ reportId: reportId ? String(reportId) : '' });
  }, [form, reportId]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    reportId ? (['filter-report', reportId] as const) : null,
    ([, id]) => orpc.filtering.report({ id }),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const notFound = error instanceof ORPCError && error.code === 'NOT_FOUND';
  const report = reportId && data?.id === reportId ? data : null;
  // The lookup strip stands alone once a report is showing below it.
  const hasBody = !reportId || Boolean(error);

  const onSubmit = ({ reportId: value }: FilterReportForm) => {
    const id = Number(value);
    if (id === reportId) {
      void mutate();
      return;
    }
    setState({ report: id });
  };

  return (
    <>
      <Panel data-testid="filter-report-view">
        <Form {...form}>
          <form
            data-testid="filter-report-form"
            role="search"
            aria-label="Look up a filter report"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn(
              'bg-muted/20 p-3 sm:p-4 dark:bg-muted',
              hasBody && 'border-b'
            )}
          >
            <FormField
              control={form.control}
              name="reportId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report ID</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        data-testid="filter-report-id-input"
                        placeholder="Enter report ID"
                        inputMode="numeric"
                        autoComplete="off"
                        className="h-10 sm:max-w-64"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="submit"
                      size="lg"
                      icon={Search}
                      data-testid="filter-report-submit"
                      pending={isLoading}
                    >
                      Load report
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {!reportId ? (
          <EmptyState
            data-testid="filter-report-empty"
            icon={FileText}
            title="Look up a filter report"
          />
        ) : notFound ? (
          <EmptyState
            data-testid="filter-report-not-found"
            icon={FileText}
            title="Filter report does not exist"
            description={`No filter report has the ID ${formatId(reportId)}.`}
          />
        ) : error ? (
          <SectionError
            title="Filter report could not load"
            retrying={isValidating}
            onRetry={() => void mutate()}
          />
        ) : null}
      </Panel>

      {reportId && !error ? (
        report ? (
          <>
            <FilterReportSummary
              reportId={report.id}
              created={report.created}
              results={report.response}
              request={report.request}
            />
            <FilteringResultsTable
              results={report.response}
              onDownloadCSV={() =>
                downloadFilterCsv(
                  report.response,
                  `filter-report-${report.id}-${csvDay()}.csv`
                )
              }
            />
          </>
        ) : (
          <ReportSkeleton reportId={reportId} />
        )
      ) : null}
    </>
  );
}
