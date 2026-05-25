'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  defaultTournamentListFilter,
  tournamentListFilterSchema,
} from '@/lib/validation-schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, ArrowUp, ArrowDown, Filter, X, Calendar } from 'lucide-react';
import { useForm, Control, UseFormReturn } from 'react-hook-form';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Ruleset,
  TournamentQuerySortType,
  VerificationStatus,
} from '@otr/core/osu';
import { usePathname, useRouter } from 'next/navigation';
import { TournamentListFilter as TournamentListFilterType } from '@/lib/types';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { RulesetEnumHelper, LobbySizeEnumHelper } from '@/lib/enum-helpers';
import { useDebounce } from '@uidotdev/usehooks';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const DEBOUNCE_DELAY = 500;
const RANK_RANGE_MIN = 1;
const RANK_RANGE_MAX = 1000000;

const sortToggleItems: readonly {
  value: TournamentQuerySortType;
  text: string;
}[] = [
  {
    value: TournamentQuerySortType.SubmissionDate,
    text: 'Submission Date',
  },
  {
    value: TournamentQuerySortType.StartTime,
    text: 'Start Date',
  },
  {
    value: TournamentQuerySortType.EndTime,
    text: 'End Date',
  },
  {
    value: TournamentQuerySortType.LobbySize,
    text: 'Lobby Size',
  },
] as const;

const verificationStatusOptions = [
  { value: VerificationStatus.None, label: 'Pending' },
  { value: VerificationStatus.PreRejected, label: 'Pre-rejected' },
  { value: VerificationStatus.PreVerified, label: 'Pre-verified' },
  { value: VerificationStatus.Rejected, label: 'Rejected' },
  { value: VerificationStatus.Verified, label: 'Verified' },
] as const;

const lobbySizeOptions = [1, 2, 3, 4, 5, 6, 7, 8] as const;

type FilterFormData = z.infer<typeof tournamentListFilterSchema>;

interface TournamentListFilterProps {
  filter: FilterFormData;
}

const scaleExponentially = (value: number, min: number, max: number) => {
  return Math.round(min * Math.pow(max / min, value / 100));
};

const scaleInverseExponentially = (value: number, min: number, max: number) => {
  if (value <= min) return 0;
  if (value >= max) return 100;
  return (Math.log(value / min) / Math.log(max / min)) * 100;
};

const useSearchInput = (initialQuery: string) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);

  const handleSetQuery = useCallback((input: string) => {
    setSearchQuery(input.trimStart());
  }, []);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  return {
    searchQuery,
    debouncedQuery,
    handleSetQuery,
  };
};

const SearchInput = ({
  searchQuery,
  onQueryChange,
  onKeyDown,
  control,
}: {
  searchQuery: string;
  onQueryChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  control: Control<FilterFormData>;
}) => (
  <div className="relative flex-grow">
    <FormField
      control={control}
      name="searchQuery"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormControl>
            <Input
              {...field}
              value={searchQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search tournaments..."
              type="search"
              className="border-border bg-card focus:border-primary h-10 rounded-lg border-2 pl-10 text-base"
              onKeyDown={onKeyDown}
            />
          </FormControl>
        </FormItem>
      )}
    />
    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
  </div>
);

const SortControls = ({
  control,
  form,
  onSubmit,
}: {
  control: Control<FilterFormData>;
  form: UseFormReturn<FilterFormData>;
  onSubmit: (data: FilterFormData) => void;
}) => (
  <div className="flex items-center gap-2">
    <FormField
      control={control}
      name="sort"
      render={({ field }) => (
        <FormItem className="flex-grow">
          <Select
            value={String(field.value)}
            onValueChange={(val) => {
              field.onChange(Number(val));
              form.handleSubmit(onSubmit)();
            }}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {sortToggleItems.map(({ value, text }) => (
                <SelectItem key={`sort-${value}`} value={String(value)}>
                  {text}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
    <FormField
      control={control}
      name="descending"
      render={({ field }) => (
        <FormItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    field.onChange(!field.value);
                    form.handleSubmit(onSubmit)();
                  }}
                  aria-label={
                    field.value ? 'Sort Ascending' : 'Sort Descending'
                  }
                >
                  {field.value ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </FormControl>
            </TooltipTrigger>
            <TooltipContent>
              <p>{field.value ? 'Sort Ascending' : 'Sort Descending'}</p>
            </TooltipContent>
          </Tooltip>
        </FormItem>
      )}
    />
  </div>
);

const FilterPanel = ({
  control,
  form,
  onSubmit,
  onClear,
}: {
  control: Control<FilterFormData>;
  form: UseFormReturn<FilterFormData>;
  onSubmit: (data: FilterFormData) => void;
  onClear: () => void;
}) => {
  const availableRulesets = useMemo(
    () =>
      Object.entries(RulesetEnumHelper.metadata).filter(
        ([ruleset]) => Number(ruleset) !== Ruleset.ManiaOther
      ),
    []
  );

  return (
    <div className="space-y-4">
      {/* Ruleset */}
      <FormField
        control={control}
        name="ruleset"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ruleset</FormLabel>
            <FormControl>
              <ToggleGroup
                className="w-full gap-2"
                value={field.value !== undefined ? String(field.value) : ''}
                onValueChange={(val) => {
                  field.onChange(val ? Number(val) : undefined);
                  form.handleSubmit(onSubmit)();
                }}
                type="single"
              >
                {availableRulesets.map(([ruleset]) => (
                  <ToggleGroupItem
                    key={`ruleset-${ruleset}`}
                    className="px-0"
                    value={ruleset}
                    aria-label={Ruleset[Number(ruleset)]}
                  >
                    <RulesetIcon
                      ruleset={Number(ruleset)}
                      className={cn(
                        'size-5',
                        field.value === Number(ruleset)
                          ? 'fill-primary'
                          : 'fill-foreground'
                      )}
                    />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FormControl>
          </FormItem>
        )}
      />

      {/* Rank Range */}
      <FormField
        control={control}
        name="minRankRange"
        render={({ field: minField }) => (
          <FormField
            control={control}
            name="maxRankRange"
            render={({ field: maxField }) => (
              <FormItem>
                <FormLabel>Rank Range</FormLabel>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[
                    scaleInverseExponentially(
                      minField.value ?? RANK_RANGE_MIN,
                      RANK_RANGE_MIN,
                      RANK_RANGE_MAX
                    ),
                    scaleInverseExponentially(
                      maxField.value ?? RANK_RANGE_MAX,
                      RANK_RANGE_MIN,
                      RANK_RANGE_MAX
                    ),
                  ]}
                  onValueChange={(vals) => {
                    minField.onChange(
                      scaleExponentially(
                        vals[0],
                        RANK_RANGE_MIN,
                        RANK_RANGE_MAX
                      )
                    );
                    maxField.onChange(
                      scaleExponentially(
                        vals[1],
                        RANK_RANGE_MIN,
                        RANK_RANGE_MAX
                      )
                    );
                  }}
                  onPointerUp={() => form.handleSubmit(onSubmit)()}
                  minStepsBetweenThumbs={1}
                />
                <div className="text-muted-foreground flex justify-between text-sm">
                  <Input
                    type="number"
                    value={minField.value ?? RANK_RANGE_MIN}
                    min={RANK_RANGE_MIN}
                    max={maxField.value ?? RANK_RANGE_MAX}
                    className="w-24 p-1 text-center"
                    onChange={(e) => minField.onChange(Number(e.target.value))}
                    onBlur={() => form.handleSubmit(onSubmit)()}
                  />
                  <Input
                    type="number"
                    value={maxField.value ?? RANK_RANGE_MAX}
                    min={minField.value ?? RANK_RANGE_MIN}
                    max={RANK_RANGE_MAX}
                    className="w-24 p-1 text-center"
                    onChange={(e) => maxField.onChange(Number(e.target.value))}
                    onBlur={() => form.handleSubmit(onSubmit)()}
                  />
                </div>
              </FormItem>
            )}
          />
        )}
      />

      {/* Verification Status */}
      <FormField
        control={control}
        name="verificationStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Verification Status</FormLabel>
            <div className="flex flex-wrap gap-2">
              {verificationStatusOptions.map(({ value, label }) => {
                const isSelected = (field.value ?? []).includes(value);
                return (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${value}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        const newValue = checked
                          ? [...current, value]
                          : current.filter((v) => v !== value);
                        field.onChange(newValue);
                        form.handleSubmit(onSubmit)();
                      }}
                    />
                    <label
                      htmlFor={`status-${value}`}
                      className="cursor-pointer text-sm"
                    >
                      {label}
                    </label>
                  </div>
                );
              })}
            </div>
          </FormItem>
        )}
      />

      {/* Team Size */}
      <FormField
        control={control}
        name="lobbySize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team Size</FormLabel>
            <div className="flex flex-wrap gap-2">
              {lobbySizeOptions.map((size) => {
                const isSelected = (field.value ?? []).includes(size);
                return (
                  <div key={size} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lobby-${size}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        const newValue = checked
                          ? [...current, size]
                          : current.filter((s) => s !== size);
                        field.onChange(newValue);
                        form.handleSubmit(onSubmit)();
                      }}
                    />
                    <label
                      htmlFor={`lobby-${size}`}
                      className="cursor-pointer text-sm"
                    >
                      {LobbySizeEnumHelper.toString(size)}
                    </label>
                  </div>
                );
              })}
            </div>
          </FormItem>
        )}
      />

      {/* Start Date */}
      <FormField
        control={control}
        name="dateMin"
        render={({ field: dateMinField }) => (
          <FormField
            control={control}
            name="dateMax"
            render={({ field: dateMaxField }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateMinField.value || dateMaxField.value ? (
                        <>
                          {dateMinField.value
                            ? format(dateMinField.value, 'MMM d, yyyy')
                            : 'Start'}
                          {' - '}
                          {dateMaxField.value
                            ? format(dateMaxField.value, 'MMM d, yyyy')
                            : 'End'}
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Select date range...
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      captionLayout="dropdown"
                      fromYear={2007}
                      toYear={new Date().getFullYear() + 1}
                      selected={{
                        from: dateMinField.value,
                        to: dateMaxField.value,
                      }}
                      onSelect={(range) => {
                        dateMinField.onChange(range?.from);
                        dateMaxField.onChange(range?.to);
                        form.handleSubmit(onSubmit)();
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />
        )}
      />

      {/* Clear button */}
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClear}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
};

const countActiveFilters = (filter: FilterFormData): number => {
  let count = 0;
  if (filter.ruleset !== undefined) count++;
  if (filter.verificationStatus && filter.verificationStatus.length > 0)
    count++;
  if (filter.lobbySize && filter.lobbySize.length > 0) count++;
  if (filter.dateMin || filter.dateMax) count++;
  if (
    filter.minRankRange !== undefined &&
    filter.minRankRange !== RANK_RANGE_MIN
  )
    count++;
  if (
    filter.maxRankRange !== undefined &&
    filter.maxRankRange !== RANK_RANGE_MAX
  )
    count++;
  return count;
};

export default function TournamentListFilter({
  filter,
}: TournamentListFilterProps) {
  const { searchQuery, debouncedQuery, handleSetQuery } = useSearchInput(
    filter.searchQuery ?? ''
  );

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const router = useRouter();
  const pathName = usePathname();

  const normalizedFilter = useMemo(
    () => ({
      ...defaultTournamentListFilter,
      ...filter,
      searchQuery: debouncedQuery,
      dateMin: filter.dateMin ? new Date(filter.dateMin) : undefined,
      dateMax: filter.dateMax ? new Date(filter.dateMax) : undefined,
    }),
    [filter, debouncedQuery]
  );

  const form = useForm<FilterFormData>({
    resolver: zodResolver(tournamentListFilterSchema),
    defaultValues: normalizedFilter,
    mode: 'all',
  });

  useEffect(() => {
    form.reset(normalizedFilter);
  }, [form, normalizedFilter]);

  const onSubmit = useCallback(
    (data: FilterFormData) => {
      const searchParams = new URLSearchParams();

      Object.entries(data).forEach(([key, value]) => {
        const filterKey = key as keyof TournamentListFilterType;

        if (
          value === undefined ||
          (typeof value === 'string' && value.trim() === '')
        ) {
          return;
        }

        const defaultValue = defaultTournamentListFilter[filterKey];

        if (Array.isArray(value)) {
          const defaultArray = Array.isArray(defaultValue) ? defaultValue : [];
          if (
            value.length === 0 ||
            JSON.stringify(value) === JSON.stringify(defaultArray)
          ) {
            return;
          }
          value.forEach((v) => searchParams.append(filterKey, String(v)));
          return;
        }

        if (defaultValue === value) {
          return;
        }

        if (value instanceof Date) {
          searchParams.set(filterKey, value.toISOString().split('T')[0]);
        } else {
          searchParams.set(filterKey, String(value));
        }
      });

      const newPath =
        searchParams.size > 0 ? `${pathName}?${searchParams}` : pathName;
      const currentUrl = window.location.pathname + window.location.search;

      if (currentUrl !== newPath) {
        router.push(newPath, { scroll: false });
      }
    },
    [pathName, router]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.setValue('searchQuery', searchQuery, { shouldValidate: true });
        form.handleSubmit(onSubmit)();
      }
    },
    [searchQuery, form, onSubmit]
  );

  const handleClearFilters = useCallback(() => {
    form.reset({
      ...defaultTournamentListFilter,
      searchQuery: '',
    } as FilterFormData);
    router.push(pathName);
    setIsFilterOpen(false);
  }, [form, router, pathName]);

  useEffect(() => {
    const currentFormQuery = form.getValues('searchQuery');
    if (debouncedQuery !== currentFormQuery) {
      form.setValue('searchQuery', debouncedQuery);
      form.handleSubmit(onSubmit)();
    }
  }, [debouncedQuery, form, onSubmit]);

  const activeFilterCount = countActiveFilters(form.getValues());

  return (
    <Form {...form}>
      <form>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <SearchInput
              searchQuery={searchQuery}
              onQueryChange={handleSetQuery}
              onKeyDown={handleSearchKeyDown}
              control={form.control}
            />
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-popover flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <FilterPanel
                  control={form.control}
                  form={form}
                  onSubmit={onSubmit}
                  onClear={handleClearFilters}
                />
              </PopoverContent>
            </Popover>
          </div>
          <SortControls
            control={form.control}
            form={form}
            onSubmit={onSubmit}
          />
        </div>
      </form>
    </Form>
  );
}
