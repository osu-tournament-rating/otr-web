'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Filter, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  type Control,
  type Resolver,
  useForm,
  useWatch,
} from 'react-hook-form';
import {
  Ruleset,
  TournamentQuerySortType,
  TournamentRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';
import { z } from 'zod';

import FilterChip from '@/components/filters/FilterChip';
import FilterPopover, {
  type FilterField,
} from '@/components/filters/FilterPopover';
import { useDeferredFilterApply } from '@/components/filters/useDeferredFilterApply';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
  LobbySizeEnumHelper,
  RulesetEnumHelper,
  TournamentRejectionReasonEnumHelper,
} from '@/lib/enum-helpers';
import { type TournamentListFilter as TournamentListFilterType } from '@/lib/types';
import { formatUTCDate } from '@/lib/utils/date';
import {
  defaultTournamentListFilter,
  tournamentListFilterSchema,
} from '@/lib/validation-schema';
import {
  RANK_RANGE_MAX,
  RANK_RANGE_MIN,
  hasRankRangeFilter,
  toRankRangeFilter,
  tournamentRankScale,
} from '@/lib/filters/tournament-rank';
import { resolveTournamentSort } from '@/lib/filters/tournament-sort';

const sortOptions: readonly {
  value: TournamentQuerySortType;
  label: string;
}[] = [
  {
    value: TournamentQuerySortType.EndTime,
    label: 'Completion date',
  },
  {
    value: TournamentQuerySortType.StartTime,
    label: 'Start date',
  },
  {
    value: TournamentQuerySortType.SubmissionDate,
    label: 'Submission date',
  },
  {
    value: TournamentQuerySortType.LobbySize,
    label: 'Team size',
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

const rejectionReasonOptions = Object.entries(
  TournamentRejectionReasonEnumHelper.metadata
)
  .filter(([value]) => Number(value) !== TournamentRejectionReason.None)
  .map(([value, metadata]) => ({
    value: Number(value) as TournamentRejectionReason,
    label: metadata.text,
  }));

type FilterFormData = z.infer<typeof tournamentListFilterSchema>;
/** Filter edits debounce; `immediate` navigates straight away. */
type ApplyFilterPatch = (
  patch: Partial<FilterFormData>,
  immediate?: boolean
) => void;

interface TournamentListFilterProps {
  filter: FilterFormData;
}

const fromDateInputValue = (value?: string) =>
  value ? new Date(`${value}T00:00:00.000Z`) : undefined;

function useSearchInput(initialQuery: string) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  return { searchQuery, setSearchQuery };
}

function SearchInput({
  searchQuery,
  onQueryChange,
  onKeyDown,
  control,
}: {
  searchQuery: string;
  onQueryChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  control: Control<FilterFormData>;
}) {
  return (
    <FormField
      control={control}
      name="searchQuery"
      render={({ field }) => (
        <FormItem className="min-w-0 flex-1">
          <FormLabel className="sr-only">Search tournaments</FormLabel>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <FormControl>
              <Input
                {...field}
                data-testid="tournament-search-input"
                value={searchQuery}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search by name or abbreviation"
                type="search"
                className="h-10 bg-background pr-3 pl-9 dark:bg-input/50 dark:shadow-none"
                autoComplete="off"
              />
            </FormControl>
          </div>
        </FormItem>
      )}
    />
  );
}

function SortControls({
  control,
  searchQuery,
  applyPatch,
}: {
  control: Control<FilterFormData>;
  searchQuery: string;
  applyPatch: ApplyFilterPatch;
}) {
  const searching = searchQuery.trim().length > 0;
  const byRelevance =
    resolveTournamentSort(useWatch({ control, name: 'sort' }), searchQuery) ===
    TournamentQuerySortType.SearchQueryRelevance;

  return (
    <>
      <FormField
        control={control}
        name="sort"
        render={({ field }) => {
          const sort = resolveTournamentSort(field.value, searchQuery);

          return (
            <FormItem className="min-w-0">
              <FormLabel className="sr-only">Sort tournaments by</FormLabel>
              <Select
                value={String(sort)}
                // Sorting applies at once, carrying any pending edit with it.
                // Radix reports an empty value while its items change.
                onValueChange={(value) => {
                  if (!value) return;
                  const sort = Number(value) as TournamentQuerySortType;
                  field.onChange(sort);
                  applyPatch({ sort }, true);
                }}
              >
                <FormControl>
                  <SelectTrigger
                    data-testid="tournament-sort-select"
                    className="h-10 w-full bg-background md:w-44 dark:bg-input/50 dark:shadow-none"
                  >
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    value={String(TournamentQuerySortType.SearchQueryRelevance)}
                    disabled={!searching}
                  >
                    Search relevance
                  </SelectItem>
                  {sortOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={String(value)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          );
        }}
      />

      <FormField
        control={control}
        name="descending"
        render={({ field }) => {
          const nextDirection = field.value ? 'ascending' : 'descending';
          const currentDirection = field.value ? 'descending' : 'ascending';

          return (
            <FormItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-10 bg-background dark:bg-input/50 dark:shadow-none"
                      data-testid="tournament-sort-direction"
                      disabled={byRelevance}
                      aria-label={
                        byRelevance
                          ? 'Search relevance has no sort order.'
                          : `Sort order is ${currentDirection}. Switch to ${nextDirection}.`
                      }
                      onClick={() => {
                        const descending = !field.value;
                        field.onChange(descending);
                        applyPatch({ descending }, true);
                      }}
                    >
                      {field.value ? (
                        <ArrowDown aria-hidden="true" />
                      ) : (
                        <ArrowUp aria-hidden="true" />
                      )}
                    </Button>
                  </FormControl>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {currentDirection[0].toUpperCase() +
                      currentDirection.slice(1)}{' '}
                    order
                  </p>
                </TooltipContent>
              </Tooltip>
            </FormItem>
          );
        }}
      />
    </>
  );
}

function RulesetFilter({
  value,
  applyPatch,
}: {
  value?: Ruleset;
  applyPatch: ApplyFilterPatch;
}) {
  const availableRulesets = useMemo(
    () =>
      Object.entries(RulesetEnumHelper.metadata).filter(
        ([ruleset]) => Number(ruleset) !== Ruleset.ManiaOther
      ),
    []
  );

  const options = [
    { value: undefined, label: 'All', icon: 'all' as const },
    ...availableRulesets.map(([ruleset, metadata]) => ({
      value: Number(ruleset) as Ruleset,
      label: metadata.text.replace('osu!', '') || 'osu!',
      icon: Number(ruleset) as Ruleset,
    })),
  ];

  return (
    <div aria-label="Filter by ruleset" className="min-w-0">
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <FilterChip
            key={option.value ?? 'all'}
            label={option.label.trim()}
            icon={
              <RulesetIcon
                ruleset={option.icon}
                className="size-4 fill-current"
                aria-hidden="true"
              />
            }
            selected={value === option.value}
            onClick={() => applyPatch({ ruleset: option.value })}
          />
        ))}
      </div>
    </div>
  );
}

/** Descriptors for the shared filter popover; every field applies immediately. */
function buildFilterFields(
  filter: FilterFormData,
  applyPatch: ApplyFilterPatch
): FilterField[] {
  const verificationStatus = filter.verificationStatus ?? [];
  const lobbySize = filter.lobbySize ?? [];
  const rejectionReason =
    filter.rejectionReason ?? TournamentRejectionReason.None;

  return [
    {
      id: 'status',
      kind: 'multi-select',
      label: 'Status',
      placeholder: 'Any status',
      options: verificationStatusOptions,
      value: verificationStatus,
      onChange: (value, checked) =>
        applyPatch({
          verificationStatus: checked
            ? [...verificationStatus, value as VerificationStatus]
            : verificationStatus.filter((status) => status !== value),
        }),
    },
    {
      id: 'team-size',
      kind: 'multi-select',
      label: 'Team size',
      placeholder: 'Any team size',
      options: lobbySizeOptions.map((size) => ({
        value: size,
        label: LobbySizeEnumHelper.toString(size),
      })),
      value: lobbySize,
      onChange: (value, checked) =>
        applyPatch({
          lobbySize: checked
            ? [...lobbySize, value]
            : lobbySize.filter((size) => size !== value),
        }),
    },
    {
      id: 'rejection-reason',
      kind: 'multi-select',
      label: 'Rejection reason',
      placeholder: 'Any rejection reason',
      options: rejectionReasonOptions,
      // Persisted as a bitfield; the popover speaks in selected flags.
      value: rejectionReasonOptions
        .filter(({ value }) => (rejectionReason & value) === value)
        .map(({ value }) => value),
      onChange: (value, checked) => {
        const next = checked
          ? rejectionReason | value
          : rejectionReason & ~value;
        applyPatch({ rejectionReason: next || undefined });
      },
    },
    {
      id: 'rank',
      kind: 'range',
      label: 'Rank restriction',
      description: 'Use 1 for open-rank tournaments.',
      // Keeps the thumbs named "Minimum rank" / "Maximum rank".
      valueLabel: 'rank',
      min: RANK_RANGE_MIN,
      max: RANK_RANGE_MAX,
      scale: tournamentRankScale,
      format: (value) => value.toLocaleString(),
      value: {
        min: filter.minRankRange ?? RANK_RANGE_MIN,
        max: filter.maxRankRange ?? RANK_RANGE_MAX,
      },
      onChange: (range) => applyPatch(toRankRangeFilter(range)),
    },
    {
      id: 'dates',
      kind: 'date-range',
      label: 'Tournament dates',
      value: {
        from: filter.dateMin ? formatUTCDate(filter.dateMin) : undefined,
        to: filter.dateMax ? formatUTCDate(filter.dateMax) : undefined,
      },
      onChange: ({ from, to }) =>
        applyPatch({
          dateMin: fromDateInputValue(from),
          dateMax: fromDateInputValue(to),
        }),
    },
  ];
}

function countAdvancedFilters(filter: FilterFormData): number {
  return [
    filter.verified,
    Boolean(filter.verificationStatus?.length),
    filter.rejectionReason !== undefined,
    Boolean(filter.lobbySize?.length),
    Boolean(filter.dateMin || filter.dateMax),
    hasRankRangeFilter(filter),
  ].filter(Boolean).length;
}

function ActiveFilterSummary({
  filter,
  applyPatch,
  onClearAll,
}: {
  filter: FilterFormData;
  applyPatch: ApplyFilterPatch;
  onClearAll: () => void;
}) {
  const filters: Array<{
    key: string;
    label: string;
    clear: () => void;
  }> = [];

  if (filter.verified) {
    filters.push({
      key: 'verified',
      label: 'Verified only',
      clear: () => applyPatch({ verified: false }),
    });
  }

  if (filter.verificationStatus?.length) {
    const labels = filter.verificationStatus.map(
      (status) =>
        verificationStatusOptions.find((option) => option.value === status)
          ?.label ?? String(status)
    );
    filters.push({
      key: 'status',
      label: `Status: ${labels.slice(0, 2).join(', ')}${labels.length > 2 ? ` +${labels.length - 2}` : ''}`,
      clear: () => applyPatch({ verificationStatus: [] }),
    });
  }

  if (filter.rejectionReason !== undefined) {
    const labels = rejectionReasonOptions
      .filter(
        ({ value }) =>
          ((filter.rejectionReason ?? TournamentRejectionReason.None) &
            value) ===
          value
      )
      .map(({ label }) => label);
    filters.push({
      key: 'rejection-reason',
      label: `Reason: ${labels.slice(0, 2).join(', ')}${labels.length > 2 ? ` +${labels.length - 2}` : ''}`,
      clear: () => applyPatch({ rejectionReason: undefined }),
    });
  }

  if (filter.lobbySize?.length) {
    filters.push({
      key: 'lobby',
      label: `Team: ${filter.lobbySize
        .map((size) => LobbySizeEnumHelper.toString(size))
        .join(', ')}`,
      clear: () => applyPatch({ lobbySize: [] }),
    });
  }

  if (filter.dateMin || filter.dateMax) {
    const from = filter.dateMin ? formatUTCDate(filter.dateMin) : 'Any time';
    const through = filter.dateMax ? formatUTCDate(filter.dateMax) : 'Now';
    filters.push({
      key: 'dates',
      label: `Dates: ${from} – ${through}`,
      clear: () => applyPatch({ dateMin: undefined, dateMax: undefined }),
    });
  }

  if (hasRankRangeFilter(filter)) {
    const max =
      filter.maxRankRange === undefined
        ? `${RANK_RANGE_MAX.toLocaleString()}+`
        : filter.maxRankRange.toLocaleString();
    filters.push({
      key: 'rank',
      label: `Rank: ${(filter.minRankRange ?? RANK_RANGE_MIN).toLocaleString()} – ${max}`,
      clear: () =>
        applyPatch({
          minRankRange: RANK_RANGE_MIN,
          maxRankRange: undefined,
        }),
    });
  }

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      <span className="text-xs font-medium text-muted-foreground">
        Active filters
      </span>
      {filters.map((activeFilter) => (
        <button
          key={activeFilter.key}
          type="button"
          onClick={activeFilter.clear}
          aria-label={`Remove ${activeFilter.label} filter`}
          className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 text-xs transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/50 dark:shadow-none"
        >
          <span className="truncate">{activeFilter.label}</span>
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 px-2 text-xs text-muted-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}

export default function TournamentListFilter({
  filter,
}: TournamentListFilterProps) {
  const { searchQuery, setSearchQuery } = useSearchInput(
    filter.searchQuery ?? ''
  );
  const router = useRouter();
  const pathname = usePathname();

  const normalizedFilter = useMemo(
    () => ({
      ...defaultTournamentListFilter,
      ...filter,
      searchQuery: filter.searchQuery ?? '',
      dateMin: filter.dateMin ? new Date(filter.dateMin) : undefined,
      dateMax: filter.dateMax ? new Date(filter.dateMax) : undefined,
    }),
    [filter]
  );

  const form = useForm<FilterFormData>({
    resolver: zodResolver(
      tournamentListFilterSchema
    ) as Resolver<FilterFormData>,
    defaultValues: normalizedFilter,
    mode: 'all',
  });

  useEffect(() => {
    form.reset(normalizedFilter);
  }, [form, normalizedFilter]);

  const submitValues = useCallback(
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
          value.forEach((item) => searchParams.append(filterKey, String(item)));
          return;
        }

        if (defaultValue === value) return;

        if (value instanceof Date) {
          searchParams.set(filterKey, formatUTCDate(value));
        } else {
          searchParams.set(filterKey, String(value));
        }
      });

      const newPath =
        searchParams.size > 0
          ? `${pathname}?${searchParams.toString()}`
          : pathname;
      const currentUrl = window.location.pathname + window.location.search;

      if (currentUrl !== newPath) {
        router.push(newPath, { scroll: false });
      }
    },
    [pathname, router]
  );

  const { schedule, applyNow, cancel } = useDeferredFilterApply(submitValues);

  const applyPatch = useCallback<ApplyFilterPatch>(
    (patch, immediate = false) => {
      const values = {
        ...form.getValues(),
        searchQuery,
        ...patch,
      } as FilterFormData;
      // The form is the optimistic copy of the scheduled navigation
      form.reset(values);
      (immediate ? applyNow : schedule)(values);
    },
    [applyNow, form, schedule, searchQuery]
  );

  const handleSetQuery = useCallback(
    (input: string) => {
      const next = input.trimStart();
      setSearchQuery(next);
      schedule({ ...form.getValues(), searchQuery: next } as FilterFormData);
    },
    [form, schedule, setSearchQuery]
  );

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyPatch({ searchQuery }, true);
      }
    },
    [applyPatch, searchQuery]
  );

  const handleClearFilters = useCallback(() => {
    cancel();
    setSearchQuery('');
    form.reset({
      ...defaultTournamentListFilter,
      searchQuery: '',
    } as FilterFormData);
    router.push(pathname, { scroll: false });
  }, [cancel, form, pathname, router, setSearchQuery]);

  const currentFilter = form.watch();
  const activeFilterCount = countAdvancedFilters(currentFilter);
  const filterFields = buildFilterFields(currentFilter, applyPatch);

  return (
    <Form {...form}>
      <form onSubmit={(event) => event.preventDefault()} className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            searchQuery={searchQuery}
            onQueryChange={handleSetQuery}
            onKeyDown={handleSearchKeyDown}
            control={form.control}
          />

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:shrink-0 md:items-center md:border-l md:pl-4">
            <div
              role="group"
              aria-label="Tournament sorting"
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex"
            >
              <SortControls
                control={form.control}
                searchQuery={searchQuery}
                applyPatch={applyPatch}
              />
            </div>

            <div className="border-l pl-2 md:pl-4">
              <FilterPopover
                title="Filter tournaments"
                testIdPrefix="tournament"
                activeCount={activeFilterCount}
                onClearAll={handleClearFilters}
                fields={filterFields}
              >
                <Button
                  data-testid="tournament-filters-button"
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 bg-background dark:bg-input/50 dark:shadow-none"
                  aria-label={`Advanced filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
                >
                  <Filter aria-hidden="true" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </FilterPopover>
            </div>
          </div>
        </div>

        <RulesetFilter value={currentFilter.ruleset} applyPatch={applyPatch} />

        <ActiveFilterSummary
          filter={currentFilter}
          applyPatch={applyPatch}
          onClearAll={handleClearFilters}
        />
      </form>
    </Form>
  );
}
