'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FilteringResultsTable from '@/components/filtering/FilteringResultsTable';
import { getFilterReport } from '@/lib/actions/filtering';
import type {
  FilteringResultDTO,
  FilterReportDTO,
} from '@osu-tournament-rating/otr-api-client';
import { RulesetEnumHelper } from '@/lib/enums';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  FileText,
  ClipboardCheck,
  Filter,
} from 'lucide-react';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { downloadCSV } from '@/lib/utils/csv';
import { getFailureReasons } from './FailureReasonsBadges';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

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
  const [report, setReport] = useState<FilterReportDTO | null>(null);
  const [results, setResults] = useState<FilteringResultDTO | null>(null);

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
      const { data: report } = await getFilterReport(
        parseInt(data.reportId, 10)
      );

      if (report) {
        setReport(report);
        if (report.response) {
          setResults(report.response);
          toast.success(`Successfully loaded filter report #${data.reportId}`);
        } else {
          toast.error('Filter report exists but contains no results data');
        }
      } else {
        toast.error('Filter report not found');
      }
    } catch {
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
      'Current Rating',
      'Peak Rating',
      'osu! Global Rank',
      'Tournaments Played',
      'Matches Played',
      'Failure Reasons',
    ];

    const rows = results.filteringResults.map((player) => [
      player.osuId.toString(),
      player.username || 'N/A',
      player.playerId?.toString() || 'N/A',
      player.isSuccess ? 'Passed' : 'Failed',
      player.currentRating?.toFixed(2) || 'N/A',
      player.peakRating?.toFixed(2) || 'N/A',
      player.osuGlobalRank?.toString() || 'N/A',
      player.tournamentsPlayed?.toString() || 'N/A',
      player.matchesPlayed?.toString() || 'N/A',
      player.failureReason
        ? getFailureReasons(player.failureReason).join(', ')
        : '',
    ]);

    downloadCSV(
      rows,
      headers,
      `filter-report-${report?.id || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="flex flex-col gap-8">
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
              <div className="flex gap-4 rounded-lg bg-muted/50 p-3">
                <div className="px-2 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                    {results.playersPassed}
                  </p>
                  <p className="text-xs tracking-wider text-muted-foreground uppercase">
                    Passed
                  </p>
                </div>
                <div className="h-auto w-px bg-border" />
                <div className="px-2 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">
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
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-muted/30 p-4 text-sm md:grid-cols-3 lg:grid-cols-4">
                  <div>
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
                      Min. osu! Global Rank
                    </span>
                    <p
                      className={
                        report.request.minOsuRank
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.minOsuRank
                        ? `#${report.request.minOsuRank.toLocaleString()}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Max osu! Global Rank
                    </span>
                    <p
                      className={
                        report.request.maxOsuRank
                          ? 'mt-0.5 font-medium'
                          : 'mt-0.5 text-sm text-muted-foreground/60'
                      }
                    >
                      {report.request.maxOsuRank
                        ? `#${report.request.maxOsuRank.toLocaleString()}`
                        : '—'}
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
