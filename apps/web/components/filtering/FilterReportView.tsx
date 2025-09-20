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
      'Peak Rating',
      'Tournaments Played',
      'Matches Played',
      'Failure Reasons',
    ];

    const rows = results.filteringResults.map((player) => [
      player.osuId?.toString() || 'N/A',
      player.username || 'N/A',
      player.playerId?.toString() || 'N/A',
      player.isSuccess ? 'Passed' : 'Failed',
      player.currentRating != null ? player.currentRating.toFixed(2) : 'N/A',
      player.peakRating != null ? player.peakRating.toFixed(2) : 'N/A',
      player.tournamentsPlayed != null
        ? player.tournamentsPlayed.toString()
        : 'N/A',
      player.matchesPlayed != null ? player.matchesPlayed.toString() : 'N/A',
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
            <FileText className="size-6 text-primary" />
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
                  <ClipboardCheck className="size-6 text-primary" />
                  Filter Report #{report.id}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
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
              <div className="flex gap-3 rounded-lg bg-muted/50 p-3 sm:gap-4">
                <div className="flex-1 text-center sm:flex-initial sm:px-2">
                  <p className="text-xl font-bold text-green-600 sm:text-2xl dark:text-green-500">
                    {results.playersPassed}
                  </p>
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    Passed
                  </p>
                </div>
                <div className="h-auto w-px bg-border" />
                <div className="flex-1 text-center sm:flex-initial sm:px-2">
                  <p className="text-xl font-bold text-red-600 sm:text-2xl dark:text-red-500">
                    {results.playersFailed}
                  </p>
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
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
                    <Filter className="size-4 text-muted-foreground" />
                    Filter Criteria
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {report.request.osuPlayerIds.length}{' '}
                    {report.request.osuPlayerIds.length === 1
                      ? 'player'
                      : 'players'}{' '}
                    checked
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/30 p-4 text-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  <div className="sm:col-span-2 md:col-span-1">
                    <span className="text-xs text-muted-foreground">
                      Ruleset
                    </span>
                    <p className="mt-0.5 flex items-center gap-1.5 font-medium">
                      <RulesetIcon
                        ruleset={report.request.ruleset}
                        className="size-4 fill-primary"
                      />
                      <span>
                        {
                          RulesetEnumHelper.metadata[report.request.ruleset]
                            .text
                        }
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Min. Rating
                    </span>
                    <p
                      className={
                        report.request.minRating
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.minRating ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Max Rating
                    </span>
                    <p
                      className={
                        report.request.maxRating
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.maxRating ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Peak Rating Limit
                    </span>
                    <p
                      className={
                        report.request.peakRating
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.peakRating ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Min. Tournaments
                    </span>
                    <p
                      className={
                        report.request.tournamentsPlayed
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.tournamentsPlayed ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Min. Matches
                    </span>
                    <p
                      className={
                        report.request.matchesPlayed
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.matchesPlayed ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Max. Tournaments
                    </span>
                    <p
                      className={
                        report.request.maxTournamentsPlayed
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.maxTournamentsPlayed ?? '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Max. Matches
                    </span>
                    <p
                      className={
                        report.request.maxMatchesPlayed
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.maxMatchesPlayed ?? '—'}
                    </p>
                  </div>
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
