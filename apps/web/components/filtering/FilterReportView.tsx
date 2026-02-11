'use client';

import { useState } from 'react';
import {
  Loader2,
  Search,
  FileText,
  ClipboardCheck,
  Filter,
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ORPCError } from '@orpc/client';
import FilteringResultsTable from '@/components/filtering/FilteringResultsTable';
import RulesetIcon from '@/components/icons/RulesetIcon';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FilterReport, FilteringResult } from '@/lib/orpc/schema/filtering';
import { orpc } from '@/lib/orpc/orpc';
import { RulesetEnumHelper } from '@/lib/enums';
import { downloadCSV } from '@/lib/utils/csv';
import { getFailureReasons } from './FailureReasonsBadges';

const filterReportSchema = z.object({
  reportId: z
    .string()
    .min(1, 'Report ID is required')
    .regex(/^\d+$/, 'Report ID must be a number')
    .refine((val) => {
      const num = parseInt(val, 10);
      return num >= 1 && num <= 2147483647;
    }, 'Number is too large'),
});

type FilterReportForm = z.infer<typeof filterReportSchema>;

export function FilterReportView() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<FilterReport | null>(null);
  const [results, setResults] = useState<FilteringResult | null>(null);

  const form = useForm<FilterReportForm>({
    resolver: zodResolver(filterReportSchema),
    defaultValues: {
      reportId: '',
    },
  });

  const onSubmit = async (data: FilterReportForm) => {
    setIsLoading(true);
    setReport(null);
    setResults(null);

    try {
      const report = await orpc.filtering.report({
        id: parseInt(data.reportId, 10),
      });

      setReport(report);
      if (report.response) {
        setResults(report.response);
      } else {
        toast.error('Filter report exists but contains no results data');
      }
    } catch (error) {
      if (error instanceof ORPCError && error.code === 'NOT_FOUND') {
        toast.error('Filter report does not exist.');
        return;
      }

      toast.error('Failed to load filter report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results) return;

    const headers = [
      'osu! ID',
      'Username',
      'Player ID',
      'Status',
      'Rating',
      'Failure Reasons',
    ];

    const rows = results.filteringResults.map((player) => [
      player.osuId?.toString() || 'N/A',
      player.username || 'N/A',
      player.playerId?.toString() || 'N/A',
      player.isSuccess ? 'Passed' : 'Failed',
      player.currentRating != null ? player.currentRating.toFixed(2) : 'N/A',
      getFailureReasons(player.failureReason ?? undefined).join(', '),
    ]);

    downloadCSV(
      rows,
      headers,
      `filter-report-${report?.id || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="text-primary size-6" />
            Filter Report Lookup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <FormField
                control={form.control}
                name="reportId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Report ID</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Enter report ID"
                          type="text"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        aria-label="Load filter report"
                      >
                        {isLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Search className="size-4" />
                        )}
                        <span className="ml-2">Load Report</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      {report && results && (
        <Card>
          {/* Report Header */}
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <ClipboardCheck className="text-primary size-6" />
                  Filter Report #{report.id}
                </CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Generated on{' '}
                  {new Date(report.created).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="bg-muted/50 flex gap-3 rounded-lg p-3 sm:gap-4">
                <div className="flex-1 text-center sm:flex-initial sm:px-2">
                  <p className="text-xl font-bold text-green-600 sm:text-2xl dark:text-green-500">
                    {results.playersPassed}
                  </p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Passed
                  </p>
                </div>
                <div className="bg-border h-auto w-px" />
                <div className="flex-1 text-center sm:flex-initial sm:px-2">
                  <p className="text-xl font-bold text-red-600 sm:text-2xl dark:text-red-500">
                    {results.playersFailed}
                  </p>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Failed
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Filter Criteria Section */}
            {report.request && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Filter className="text-muted-foreground size-4" />
                    Filter Criteria
                  </h3>
                  <span className="text-muted-foreground text-sm">
                    {report.request.osuPlayerIds.length}{' '}
                    {report.request.osuPlayerIds.length === 1
                      ? 'player'
                      : 'players'}{' '}
                    checked
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  <StatCard
                    icon={
                      <RulesetIcon
                        ruleset={report.request.ruleset}
                        className="fill-primary size-5"
                      />
                    }
                    label="Ruleset"
                    value={
                      RulesetEnumHelper.metadata[report.request.ruleset].text
                    }
                  />
                  <StatCard
                    label="Min. Rating"
                    value={report.request.minRating ?? '—'}
                    valueClassName={
                      !report.request.minRating
                        ? 'text-muted-foreground/60'
                        : undefined
                    }
                  />
                  <StatCard
                    label="Max Rating"
                    value={report.request.maxRating ?? '—'}
                    valueClassName={
                      !report.request.maxRating
                        ? 'text-muted-foreground/60'
                        : undefined
                    }
                  />
                </div>
              </div>
            )}

            {/* Results Table Section */}
            <div>
              <FilteringResultsTable
                results={results}
                onDownloadCSV={handleDownloadCSV}
                hideCard
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
