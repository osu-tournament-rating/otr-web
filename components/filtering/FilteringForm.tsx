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
} from '@osu-tournament-rating/otr-api-client';
import { getFailureReasons } from './FailureReasonsBadges';
import FilteringResultsTable from './FilteringResultsTable';
import { downloadCSV } from '@/lib/utils/csv';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import FilterComplianceNotice from './FilterComplianceNotice';
import { useEffect, useRef } from 'react';

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

// Local NumberInput component
interface NumberInputProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  tooltip: string;
  placeholder?: string;
  min?: number;
}

function NumberInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  tooltip,
  placeholder,
  min,
}: NumberInputProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <LabelWithTooltip label={label} tooltip={tooltip} />
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              min={min}
              {...field}
              className="border-2 border-input bg-card shadow-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FilteringFormProps {
  onFilteringComplete: (results: FilteringResultDTO) => void;
  filteringResults: FilteringResultDTO | null;
}

export default function FilteringForm({
  onFilteringComplete,
  filteringResults,
}: FilteringFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const initialValuesRef = useRef<FilteringFormValues | null>(null);

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

  // Store initial values when form is first loaded
  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = form.getValues();
    }
  }, [form]);

  // Check if only ruleset has changed
  const hasOnlyRulesetChanged = (values: FilteringFormValues): boolean => {
    if (!initialValuesRef.current) return false;

    const initial = initialValuesRef.current;
    const fieldsToCheck: (keyof FilteringFormValues)[] = [
      'minRating',
      'maxRating',
      'tournamentsPlayed',
      'peakRating',
      'matchesPlayed',
      'minRank',
      'maxRank',
    ];

    // Check if any field other than ruleset has changed
    const hasOtherChanges = fieldsToCheck.some(
      (field) => values[field] !== initial[field]
    );

    // Return true if ruleset changed but nothing else
    return values.ruleset !== initial.ruleset && !hasOtherChanges;
  };

  async function onSubmit(values: FilteringFormValues) {
    // Validate that not only ruleset has changed
    if (hasOnlyRulesetChanged(values)) {
      toast.error(
        'Please modify at least one filter criteria in addition to the ruleset'
      );
      return;
    }

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
        tournamentsPlayed:
          values.tournamentsPlayed === ''
            ? undefined
            : values.tournamentsPlayed,
        peakRating: values.peakRating === '' ? undefined : values.peakRating,
        matchesPlayed:
          values.matchesPlayed === '' ? undefined : values.matchesPlayed,
        minRank: values.minRank === '' ? undefined : values.minRank,
        maxRank: values.maxRank === '' ? undefined : values.maxRank,
        osuPlayerIds,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data) {
        onFilteringComplete(result.data);
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

  function handleDownloadCSV() {
    if (!filteringResults) return;

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
    const rows = filteringResults.filteringResults.map(
      (result: PlayerFilteringResultDTO) => {
        const failureReasons = getFailureReasons(result.failureReason);
        return [
          result.osuId?.toString() || '',
          result.username || 'Unknown',
          result.playerId?.toString() || 'N/A',
          result.isSuccess ? 'Passed' : 'Failed',
          result.currentRating?.toFixed(0) || 'N/A',
          result.peakRating?.toFixed(0) || 'N/A',
          result.osuGlobalRank?.toString() || 'N/A',
          result.tournamentsPlayed?.toString() || 'N/A',
          result.matchesPlayed?.toString() || 'N/A',
          failureReasons.join(', '),
        ];
      }
    );

    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(rows, headers, `otr-filtering-results-${timestamp}.csv`);
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
                <NumberInput
                  control={form.control}
                  name="minRating"
                  label="Minimum Rating"
                  tooltip="Players below this rating will be filtered out (optional, minimum: 100)"
                  placeholder="e.g. 500"
                  min={100}
                />
                <NumberInput
                  control={form.control}
                  name="maxRating"
                  label="Maximum Rating"
                  tooltip="Players above this rating will be filtered out (optional)"
                  placeholder="e.g. 2000"
                  min={100}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <NumberInput
                  control={form.control}
                  name="peakRating"
                  label="Maximum Peak Rating"
                  tooltip="Players whose all-time peak rating exceeds this value will be filtered out (optional)"
                  placeholder="e.g. 2500"
                  min={100}
                />
                <NumberInput
                  control={form.control}
                  name="tournamentsPlayed"
                  label="Minimum Tournaments"
                  tooltip="Players must have played in at least this many distinct tournaments (optional)"
                  placeholder="e.g. 3"
                  min={1}
                />
                <NumberInput
                  control={form.control}
                  name="matchesPlayed"
                  label="Minimum Matches"
                  tooltip="Players must have played in at least this many matches (optional)"
                  placeholder="e.g. 10"
                  min={1}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumberInput
                  control={form.control}
                  name="minRank"
                  label="Minimum osu! Global Rank"
                  tooltip="Players with an osu! global rank below this value will be filtered out (optional)"
                  placeholder="e.g. 1000"
                  min={1}
                />
                <NumberInput
                  control={form.control}
                  name="maxRank"
                  label="Maximum osu! Global Rank"
                  tooltip="Players with an osu! global rank above this value will be filtered out (optional)"
                  placeholder="e.g. 10000"
                  min={1}
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

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-md bg-primary py-6 text-lg font-semibold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl"
              >
                {isLoading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  'Filter Players'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  // Reset initial values reference after form reset
                  initialValuesRef.current = form.getValues();
                }}
                disabled={isLoading}
                className="rounded-md px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </Card>
      {filteringResults && (
        <>
          <FilterComplianceNotice
            filterReportId={filteringResults.filterReportId}
          />
          <FilteringResultsTable
            results={filteringResults}
            onDownloadCSV={handleDownloadCSV}
          />
        </>
      )}
    </>
  );
}
