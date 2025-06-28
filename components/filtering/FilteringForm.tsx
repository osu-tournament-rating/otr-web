'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, LoaderCircle, Users } from 'lucide-react';
import LabelWithTooltip from '../ui/LabelWithTooltip';
import { useState, useEffect, useRef } from 'react';
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
import { useForm, Control, FieldPath } from 'react-hook-form';
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
import FilterComplianceNotice from './FilterComplianceNotice';

const optionalNumberSchema = (
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    minMsg?: string;
    maxMsg?: string;
    intMsg?: string;
  } = {}
) =>
  z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce
      .number({ invalid_type_error: 'Please enter a valid number' })
      .min(options.min ?? -Infinity, options.minMsg)
      .max(options.max ?? Infinity, options.maxMsg)
      .int(options.integer ? { message: options.intMsg } : undefined)
      .optional()
  );

const filteringFormSchema = z
  .object({
    ruleset: z.coerce.number({
      invalid_type_error: 'Please select a ruleset',
      required_error: 'Please select a ruleset',
    }),
    minRating: optionalNumberSchema({
      min: 100,
      max: 5000,
      minMsg: 'Minimum rating must be at least 100',
      maxMsg: 'Maximum rating cannot exceed 5000',
    }),
    maxRating: optionalNumberSchema({
      min: 100,
      max: 5000,
      minMsg: 'Minimum rating must be at least 100',
      maxMsg: 'Maximum rating cannot exceed 5000',
    }),
    tournamentsPlayed: optionalNumberSchema({
      min: 1,
      max: 2000,
      integer: true,
      minMsg: 'Must be at least 1',
      maxMsg: 'Cannot exceed 2000 tournaments',
      intMsg: 'Must be a whole number',
    }),
    peakRating: optionalNumberSchema({
      min: 100,
      max: 5000,
      minMsg: 'Minimum rating must be at least 100',
      maxMsg: 'Maximum rating cannot exceed 5000',
    }),
    matchesPlayed: optionalNumberSchema({
      min: 1,
      max: 20000,
      integer: true,
      minMsg: 'Must be at least 1',
      maxMsg: 'Cannot exceed 20000 matches',
      intMsg: 'Must be a whole number',
    }),
    osuPlayerIds: z
      .string()
      .min(1, 'Please enter at least one osu! player ID')
      .refine(
        (val) => {
          const ids = val.split(/[\s,\n]+/).filter((id) => id.trim() !== '');
          if (ids.length === 0) return false;

          return ids.every((id) => {
            const trimmed = id.trim();
            return /^\d+$/.test(trimmed) && parseInt(trimmed, 10) > 0;
          });
        },
        {
          message:
            'Please enter valid, positive osu! player IDs separated by spaces, commas, or new lines',
        }
      )
      .refine(
        (val) => {
          const ids = val
            .split(/[\s,\n]+/)
            .filter((id) => id.trim() !== '')
            .map((id) => id.trim());
          const uniqueIds = new Set(ids);
          return ids.length === uniqueIds.size;
        },
        {
          message: 'Duplicate osu! player IDs are not allowed',
        }
      ),
  })
  .refine(
    (data) => {
      if (data.minRating && data.maxRating) {
        return data.maxRating >= data.minRating;
      }
      return true;
    },
    {
      message: 'Maximum rating must be greater than or equal to minimum rating',
      path: ['maxRating'],
    }
  );

type FilteringFormValues = z.infer<typeof filteringFormSchema>;

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

interface NumberInputProps {
  control: Control<FilteringFormValues>;
  name: FieldPath<FilteringFormValues>;
  label: string;
  tooltip: string;
  placeholder?: string;
  isInteger?: boolean;
}

function NumberInput({
  control,
  name,
  label,
  tooltip,
  placeholder,
  isInteger = false,
}: NumberInputProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <LabelWithTooltip label={label} tooltip={tooltip} />
          <FormControl>
            <Input
              type="text"
              inputMode={isInteger ? 'numeric' : 'decimal'}
              placeholder={placeholder}
              {...field}
              value={field.value ?? ''}
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
      minRating: undefined,
      maxRating: undefined,
      tournamentsPlayed: undefined,
      peakRating: undefined,
      matchesPlayed: undefined,
      osuPlayerIds: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!initialValuesRef.current) {
      initialValuesRef.current = form.getValues();
    }
  }, [form]);

  const hasOnlyRulesetChanged = (values: FilteringFormValues): boolean => {
    if (!initialValuesRef.current) return false;

    const initial = initialValuesRef.current;
    const fieldsToCheck: (keyof FilteringFormValues)[] = [
      'minRating',
      'maxRating',
      'tournamentsPlayed',
      'peakRating',
      'matchesPlayed',
    ];

    const hasOtherChanges = fieldsToCheck.some(
      (field) => values[field] !== initial[field]
    );

    return values.ruleset !== initial.ruleset && !hasOtherChanges;
  };

  async function onSubmit(values: FilteringFormValues) {
    if (hasOnlyRulesetChanged(values)) {
      toast.error(
        'Please modify at least one filter criteria in addition to the ruleset'
      );
      return;
    }

    setIsLoading(true);
    try {
      const osuPlayerIds = values.osuPlayerIds
        .split(/[\s,\n]+/)
        .filter((id) => id.trim() !== '')
        .map((id) => parseInt(id.trim()));

      const result = await filterPlayers({
        ruleset: values.ruleset as Ruleset,
        minRating: values.minRating,
        maxRating: values.maxRating,
        tournamentsPlayed: values.tournamentsPlayed,
        peakRating: values.peakRating,
        matchesPlayed: values.matchesPlayed,
        osuPlayerIds,
      });

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
                      onValueChange={(value) => field.onChange(value)}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <NumberInput
                  control={form.control}
                  name="minRating"
                  label="Minimum Rating"
                  tooltip="Players below this rating will be filtered out (optional, minimum: 100, supports decimals)"
                  placeholder="500"
                />
                <NumberInput
                  control={form.control}
                  name="maxRating"
                  label="Maximum Rating"
                  tooltip="Players above this rating will be filtered out (optional, supports decimals)"
                  placeholder="2000"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-start">
                <NumberInput
                  control={form.control}
                  name="peakRating"
                  label="Maximum Peak Rating"
                  tooltip="Players whose all-time peak rating exceeds this value will be filtered out (optional, supports decimals)"
                  placeholder="2500"
                />
                <NumberInput
                  control={form.control}
                  name="tournamentsPlayed"
                  label="Minimum Tournaments"
                  tooltip="Players must have played in at least this many distinct tournaments (optional)"
                  placeholder="3"
                  isInteger={true}
                />
                <NumberInput
                  control={form.control}
                  name="matchesPlayed"
                  label="Minimum Matches"
                  tooltip="Players must have played in at least this many matches (optional)"
                  placeholder="10"
                  isInteger={true}
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
                  <FormItem className="flex flex-col">
                    <LabelWithTooltip
                      label="osu! Player IDs *"
                      tooltip="Enter osu! player IDs separated by commas, spaces, or new lines (required)"
                    />
                    <FormControl>
                      <Textarea
                        placeholder="Enter osu! player IDs (e.g. 1234567, 2345678, 3456789)"
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
                  form.reset({
                    ruleset: undefined,
                    minRating: undefined,
                    maxRating: undefined,
                    tournamentsPlayed: undefined,
                    peakRating: undefined,
                    matchesPlayed: undefined,
                    osuPlayerIds: '',
                  });
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
