'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, LoaderCircle, Users } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Control, FieldPath } from 'react-hook-form';
import { toast } from 'sonner';
import { orpc } from '@/lib/orpc/orpc';
import { Ruleset } from '@otr/core/osu';
import {
  FilteringResult,
  PlayerFilteringResult,
} from '@/lib/orpc/schema/filtering';
import LabelWithTooltip from '@/components/ui/LabelWithTooltip';
import RulesetSelectContent from '@/components/select/RulesetSelectContent';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  <div className="space-y-3 sm:space-y-4">
    <div className="border-border flex items-center gap-2 rounded-md border-b pb-2 sm:gap-3 sm:pb-3">
      {icon}
      <h3 className="text-foreground text-lg font-semibold sm:text-xl">
        {title}
      </h3>
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
  className?: string;
}

function NumberInput({
  control,
  name,
  label,
  tooltip,
  placeholder,
  isInteger = false,
  className,
}: NumberInputProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <LabelWithTooltip label={label} tooltip={tooltip} />
          <FormControl>
            <Input
              type="text"
              inputMode={isInteger ? 'numeric' : 'decimal'}
              placeholder={placeholder}
              {...field}
              value={field.value ?? ''}
              className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary border-2 shadow-sm focus-visible:ring-1"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface FilteringFormProps {
  onFilteringComplete: (results: FilteringResult) => void;
  filteringResults: FilteringResult | null;
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

      const result = await orpc.filtering.filter({
        ruleset: values.ruleset as Ruleset,
        minRating: values.minRating,
        maxRating: values.maxRating,
        osuPlayerIds,
      });

      onFilteringComplete(result);
      toast.success(`Filtered ${osuPlayerIds.length} players successfully`);
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
      'Rating',
      'Failure Reasons',
    ];
    const rows = filteringResults.filteringResults.map(
      (result: PlayerFilteringResult) => {
        const failureReasons = getFailureReasons(
          result.failureReason ?? undefined
        );
        return [
          result.osuId?.toString() || '',
          result.username || 'Unknown',
          result.playerId?.toString() || 'N/A',
          result.isSuccess ? 'Passed' : 'Failed',
          result.currentRating != null
            ? result.currentRating.toFixed(0)
            : 'N/A',
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
            className="space-y-4 px-4 py-4 sm:px-6 sm:py-6 lg:space-y-6 lg:px-8"
          >
            <FormSection
              icon={<Settings className="text-primary size-6" />}
              title="Filter Criteria"
            >
              <p className="text-muted-foreground mb-4 text-sm">
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
                        <SelectTrigger className="border-input bg-card focus:border-primary focus:ring-primary border-2 shadow-sm focus:ring-1">
                          <SelectValue placeholder="Select a ruleset" />
                        </SelectTrigger>
                      </FormControl>
                      <RulesetSelectContent maniaOther={false} />
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
                  tooltip="Players below this rating will be filtered out"
                  placeholder="500"
                />
                <NumberInput
                  control={form.control}
                  name="maxRating"
                  label="Maximum Rating"
                  tooltip="Players above this rating will be filtered out"
                  placeholder="2000"
                />
              </div>
            </FormSection>

            <FormSection
              icon={<Users className="text-primary size-6" />}
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
                        className="border-input bg-card focus-visible:border-primary focus-visible:ring-primary min-h-[120px] border-2 shadow-sm focus-visible:ring-1 sm:min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-md text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:py-6 sm:text-lg"
              >
                {isLoading ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  'Filter Players'
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  form.reset({
                    ruleset: undefined,
                    minRating: undefined,
                    maxRating: undefined,
                    osuPlayerIds: '',
                  });
                  initialValuesRef.current = form.getValues();
                }}
                disabled={isLoading}
                className="hover:bg-secondary/80 rounded-md px-6 py-5 text-base font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:px-8 sm:py-6 sm:text-lg"
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
