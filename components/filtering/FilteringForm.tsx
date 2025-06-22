'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, LoaderCircle, Users } from 'lucide-react';
import LabelWithTooltip from '../ui/LabelWithTooltip';
import { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import RulesetSelectContent from '../select/RulesetSelectContent';
import { Select, SelectTrigger, SelectValue } from '../ui/select';
import { filterPlayers } from '@/lib/actions/filtering';
import { z } from 'zod';
import {
  FilteringResultDTO,
  PlayerFilteringResultDTO,
  Ruleset,
  FilteringFailReason,
} from '@osu-tournament-rating/otr-api-client';
import { FilteringFailReasonEnumHelper } from '@/lib/enums';
import FilteringResultsTable from './FilteringResultsTable';

const filteringFormSchema = z.object({
  ruleset: z.coerce
    .number({ invalid_type_error: 'Please select a ruleset' })
    .refine(
      (val) =>
        [
          Ruleset.Osu,
          Ruleset.Taiko,
          Ruleset.Catch,
          Ruleset.Mania4k,
          Ruleset.Mania7k,
        ].includes(val),
      {
        message: 'Please select a valid ruleset',
      }
    ),
  minRating: z.coerce.number().min(100).optional().or(z.literal('')),
  maxRating: z.coerce.number().min(100).optional().or(z.literal('')),
  tournamentsPlayed: z.coerce.number().min(1).optional().or(z.literal('')),
  peakRating: z.coerce.number().min(100).optional().or(z.literal('')),
  matchesPlayed: z.coerce.number().min(1).optional().or(z.literal('')),
  minRank: z.coerce.number().min(1).optional().or(z.literal('')),
  maxRank: z.coerce.number().min(1).optional().or(z.literal('')),
  osuPlayerIds: z.string().min(1, 'Please enter at least one osu! player ID'),
});

type FilteringFormValues = z.infer<typeof filteringFormSchema>;

// Form section component for better organization
type FormSectionProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

const FormSection = ({ icon, title, children }: FormSectionProps) => (
  <div className="space-y-6">
    <div className="mb-4 flex items-center gap-3 rounded-md border-b border-border p-3 pb-3">
      {icon}
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

export default function FilteringForm() {
  const [filteringResults, setFilteringResults] =
    useState<FilteringResultDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FilteringFormValues>({
    resolver: zodResolver(filteringFormSchema),
    defaultValues: {
      ruleset: undefined,
      minRating: '',
      maxRating: '',
      tournamentsPlayed: '',
      peakRating: '',
      matchesPlayed: '',
      minRank: '',
      maxRank: '',
      osuPlayerIds: '',
    },
    mode: 'onChange',
  });

  async function onSubmit(values: FilteringFormValues) {
    setIsLoading(true);
    try {
      // Parse osu player IDs from the textarea
      const osuPlayerIds = values.osuPlayerIds
        .split(/[\s,\n]+/)
        .filter((id) => id.trim() !== '')
        .map((id) => {
          const parsed = parseInt(id.trim());
          if (isNaN(parsed)) {
            throw new Error(`Invalid osu! player ID: ${id}`);
          }
          return parsed;
        });

      const result = await filterPlayers({
        ruleset: values.ruleset as Ruleset,
        minRating: values.minRating === '' ? undefined : values.minRating,
        maxRating: values.maxRating === '' ? undefined : values.maxRating,
        allowProvisional: true,
        tournamentsPlayed:
          values.tournamentsPlayed === ''
            ? undefined
            : values.tournamentsPlayed,
        peakRating: values.peakRating === '' ? undefined : values.peakRating,
        matchesPlayed:
          values.matchesPlayed === '' ? undefined : values.matchesPlayed,
        // TODO: Remove @ts-expect-error once API client is regenerated with updated FilteringRequestDTO
        // @ts-expect-error - minRank is not yet in the generated FilteringRequestDTO
        minRank: values.minRank === '' ? undefined : values.minRank,
        // @ts-expect-error - maxRank is not yet in the generated FilteringRequestDTO
        maxRank: values.maxRank === '' ? undefined : values.maxRank,
        osuPlayerIds,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data) {
        setFilteringResults(result.data);
        toast.success(`Filtered ${osuPlayerIds.length} players successfully`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'An error occurred while filtering players'
      );
    } finally {
      setIsLoading(false);
    }
  }

  function downloadCSV() {
    if (!filteringResults) return;

    const headers = [
      'osu! ID',
      'Username',
      'Player ID',
      'Status',
      'Failure Reasons',
    ];
    const rows = filteringResults.filteringResults.map(
      (result: PlayerFilteringResultDTO) => {
        const failureReasons = getFailureReasons(result.failureReason);
        return [
          result.osuId,
          result.username || 'Unknown',
          result.playerId || 'N/A',
          result.isSuccess ? 'Passed' : 'Failed',
          failureReasons.join(', '),
        ];
      }
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `otr-filtering-results-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getFailureReasons(failureReason?: number): string[] {
    if (!failureReason || failureReason === FilteringFailReason.None) return [];

    return FilteringFailReasonEnumHelper.getMetadata(failureReason).map(
      (metadata) => metadata.text
    );
  }

  return (
    <>
      <Card className="w-full overflow-hidden">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mx-2 space-y-8 lg:mx-8"
          >
            <FormSection
              icon={<Settings className="size-6 text-primary" />}
              title="Filter Criteria"
            >
              <p className="mb-4 text-sm text-muted-foreground">
                Fields marked with * are required
              </p>
              <FormField
                control={form.control}
                name="ruleset"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithTooltip
                      label="Ruleset *"
                      tooltip="The game mode to filter players for (required)"
                    />
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="border-2 border-input bg-card shadow-sm focus:border-primary focus:ring-1 focus:ring-primary">
                          <SelectValue placeholder="Select a ruleset" />
                        </SelectTrigger>
                      </FormControl>
                      <RulesetSelectContent />
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="minRating"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Minimum Rating"
                        tooltip="Players below this rating will be filtered out (optional, minimum: 100)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 500"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxRating"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Maximum Rating"
                        tooltip="Players above this rating will be filtered out (optional)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 2000"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="peakRating"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Maximum Peak Rating"
                        tooltip="Players whose all-time peak rating exceeds this value will be filtered out (optional)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 2500"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tournamentsPlayed"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Minimum Tournaments"
                        tooltip="Players must have played in at least this many distinct tournaments (optional)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 3"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="matchesPlayed"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Minimum Matches"
                        tooltip="Players must have played in at least this many matches (optional)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 10"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="minRank"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Minimum osu! Global Rank"
                        tooltip="Players with an osu! global rank (NOT o!TR rank) below this value will be filtered out (optional)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 1000"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxRank"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTooltip
                        label="Maximum osu! Global Rank"
                        tooltip="Players with an osu! global rank (NOT o!TR rank) above this value will be filtered out (optional)"
                      />
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g. 10000"
                          {...field}
                          className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormSection>

            <FormSection
              icon={<Users className="size-6 text-primary" />}
              title="Player IDs"
            >
              <FormField
                control={form.control}
                name="osuPlayerIds"
                render={({ field }) => (
                  <FormItem>
                    <LabelWithTooltip
                      label="osu! Player IDs *"
                      tooltip="Enter osu! player IDs separated by commas, spaces, or new lines (required)"
                    />
                    <FormControl>
                      <Textarea
                        placeholder="Enter osu! player IDs (e.g., 1234567, 2345678, 3456789)"
                        className="min-h-[120px] border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary sm:min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary py-6 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                'Filter Players'
              )}
            </Button>
          </form>
        </Form>
      </Card>
      {filteringResults && (
        <FilteringResultsTable
          results={filteringResults}
          onDownloadCSV={downloadCSV}
        />
      )}
    </>
  );
}
