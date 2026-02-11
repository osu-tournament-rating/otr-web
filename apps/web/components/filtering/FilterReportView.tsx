'use client';

import { useState } from 'react';
import {
  Loader2,
  Search,
  FileText,
  ClipboardCheck,
  Filter,
  CheckCircle2,
  XCircle,
  Users,
  TrendingUp,
  TrendingDown,
  ListFilter,
  Download,
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

  const handleNewLookup = () => {
    setReport(null);
    setResults(null);
    form.reset();
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

  const hasReport = report && results;

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      {/* Search Card — hero style when empty, compact when loaded */}
      {!hasReport ? (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
              <div className="bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full">
                <FileText className="text-primary h-8 w-8" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  Look Up a Filter Report
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Enter a report ID to view detailed filtering results for
                  tournament participants.
                </p>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
                  <FormField
                    control={form.control}
                    name="reportId"
                    render={({ field }) => (
                      <FormItem>
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
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Report Header Card — hero card with identity + stats */}
          <Card className="p-6">
            {/* Identity section */}
            <div className="bg-popover flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-muted/50 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full">
                  <ClipboardCheck className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-medium">
                    Filter Report #{report.id}
                  </h2>
                  <p className="text-muted-foreground text-sm">
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
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="size-4" />
                  Download CSV
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleNewLookup}
                  className="flex items-center gap-2"
                >
                  <Search className="size-4" />
                  New Lookup
                </Button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                icon={
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                }
                label="Passed"
                value={results.playersPassed}
                valueClassName="text-green-600 dark:text-green-500"
              />
              <StatCard
                icon={
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                }
                label="Failed"
                value={results.playersFailed}
                valueClassName="text-red-600 dark:text-red-500"
              />
              <StatCard
                icon={<Users className="text-primary h-5 w-5" />}
                label="Total Players"
                value={results.filteringResults.length}
              />
              {report.request && (
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
              )}
            </div>
          </Card>

          {/* Filter Criteria Card */}
          {report.request && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="text-primary h-6 w-6" />
                  <CardTitle className="text-xl font-bold">
                    Filter Criteria
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
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
                    icon={<TrendingUp className="text-primary h-5 w-5" />}
                    label="Min. Rating"
                    value={report.request.minRating ?? 'Not set'}
                    valueClassName={
                      !report.request.minRating
                        ? 'text-muted-foreground'
                        : undefined
                    }
                  />
                  <StatCard
                    icon={<TrendingDown className="text-primary h-5 w-5" />}
                    label="Max Rating"
                    value={report.request.maxRating ?? 'Not set'}
                    valueClassName={
                      !report.request.maxRating
                        ? 'text-muted-foreground'
                        : undefined
                    }
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Table Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListFilter className="text-primary h-6 w-6" />
                  <CardTitle className="text-xl font-bold">Results</CardTitle>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="size-4" />
                  Download CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <FilteringResultsTable
                results={results}
                onDownloadCSV={handleDownloadCSV}
                hideCard
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
