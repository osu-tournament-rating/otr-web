'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { type Control, type Resolver, useForm } from 'react-hook-form';
import { useDebounce } from '@uidotdev/usehooks';
import {
  Ruleset,
  TournamentQuerySortType,
  TournamentRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';
import { z } from 'zod';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
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
import { cn } from '@/lib/utils';
import { formatUTCDate } from '@/lib/utils/date';
import {
  defaultTournamentListFilter,
  tournamentListFilterSchema,
} from '@/lib/validation-schema';
import {
  RANK_RANGE_MAX,
  RANK_RANGE_DEFAULT_MAX,
  RANK_RANGE_MIN,
  RANK_SLIDER_MAX,
  RANK_SLIDER_MIN,
  RANK_SLIDER_STEP,
  moveRankBySliderStops,
  rankToSliderPosition,
  sliderPositionToRank,
} from './tournamentRankSlider';

const DEBOUNCE_DELAY = 500;

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
type ApplyFilterPatch = (patch: Partial<FilterFormData>) => void;

interface TournamentListFilterProps {
  filter: FilterFormData;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toDateInputValue = (value?: Date) => (value ? formatUTCDate(value) : '');

const fromDateInputValue = (value: string) =>
  value ? new Date(`${value}T00:00:00.000Z`) : undefined;

function useSearchInput(initialQuery: string) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [synchronizedQuery, setSynchronizedQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(searchQuery, DEBOUNCE_DELAY);

  const handleSetQuery = useCallback((input: string) => {
    setSearchQuery(input.trimStart());
  }, []);

  useEffect(() => {
    setSearchQuery(initialQuery);
    setSynchronizedQuery(initialQuery);
  }, [initialQuery]);

  return {
    searchQuery,
    debouncedQuery,
    handleSetQuery,
    isSynchronizing:
      synchronizedQuery !== initialQuery && searchQuery !== initialQuery,
  };
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
  applyPatch,
}: {
  control: Control<FilterFormData>;
  applyPatch: ApplyFilterPatch;
}) {
  return (
    <>
      <FormField
        control={control}
        name="sort"
        render={({ field }) => (
          <FormItem className="min-w-0">
            <FormLabel className="sr-only">Sort tournaments by</FormLabel>
            <Select
              value={String(field.value)}
              onValueChange={(value) => {
                const sort = Number(value) as TournamentQuerySortType;
                field.onChange(sort);
                applyPatch({ sort });
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
                {sortOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={String(value)}>
                    {label}
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
                      aria-label={`Sort order is ${currentDirection}. Switch to ${nextDirection}.`}
                      onClick={() => {
                        const descending = !field.value;
                        field.onChange(descending);
                        applyPatch({ descending });
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
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <Button
              key={option.value ?? 'all'}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={isSelected}
              onClick={() => applyPatch({ ruleset: option.value })}
              className={cn(
                'h-8 flex-none gap-1.5 rounded-full bg-background px-3 dark:bg-input/50 dark:shadow-none',
                isSelected &&
                  'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/25'
              )}
            >
              <RulesetIcon
                ruleset={option.icon}
                className="size-4 fill-current"
                aria-hidden="true"
              />
              {option.label.trim()}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selectedValues,
  onCheckedChange,
  testId,
}: {
  label: string;
  placeholder: string;
  options: readonly { value: number; label: string }[];
  selectedValues: readonly number[];
  onCheckedChange: (value: number, checked: boolean) => void;
  testId?: string;
}) {
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid={testId}
          aria-label={`${label}: ${summary}`}
          className="w-full justify-between bg-background font-normal dark:bg-input/50 dark:shadow-none"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={(checked) =>
              onCheckedChange(option.value, checked === true)
            }
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterPanel({
  control,
  applyPatch,
}: {
  control: Control<FilterFormData>;
  applyPatch: ApplyFilterPatch;
}) {
  const activeRankThumb = useRef<0 | 1>(0);

  return (
    <div className="space-y-8 py-2">
      <FormField
        control={control}
        name="verificationStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <MultiSelectDropdown
              label="Status"
              placeholder="Any status"
              options={verificationStatusOptions}
              selectedValues={field.value ?? []}
              testId="tournament-status-filter"
              onCheckedChange={(value, checked) => {
                const current = field.value ?? [];
                const verificationStatus = checked
                  ? [...current, value as VerificationStatus]
                  : current.filter((status) => status !== value);
                field.onChange(verificationStatus);
                applyPatch({ verificationStatus });
              }}
            />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="lobbySize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Team size</FormLabel>
            <MultiSelectDropdown
              label="Team size"
              placeholder="Any team size"
              options={lobbySizeOptions.map((size) => ({
                value: size,
                label: LobbySizeEnumHelper.toString(size),
              }))}
              selectedValues={field.value ?? []}
              testId="tournament-team-size-filter"
              onCheckedChange={(value, checked) => {
                const current = field.value ?? [];
                const lobbySize = checked
                  ? [...current, value]
                  : current.filter((currentSize) => currentSize !== value);
                field.onChange(lobbySize);
                applyPatch({ lobbySize });
              }}
            />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="rejectionReason"
        render={({ field }) => {
          const selectedReasons = rejectionReasonOptions
            .filter(({ value }) => ((field.value ?? 0) & value) === value)
            .map(({ value }) => value);

          return (
            <FormItem>
              <FormLabel>Rejection reason</FormLabel>
              <MultiSelectDropdown
                label="Rejection reason"
                placeholder="Any rejection reason"
                options={rejectionReasonOptions}
                selectedValues={selectedReasons}
                testId="tournament-rejection-reason-filter"
                onCheckedChange={(value, checked) => {
                  const current = field.value ?? 0;
                  const rejectionReason = checked
                    ? current | value
                    : current & ~value;
                  const nextValue = rejectionReason || undefined;
                  field.onChange(nextValue);
                  applyPatch({ rejectionReason: nextValue });
                }}
              />
            </FormItem>
          );
        }}
      />

      <FormField
        control={control}
        name="minRankRange"
        render={({ field: minField }) => (
          <FormField
            control={control}
            name="maxRankRange"
            render={({ field: maxField }) => {
              const minRank = minField.value ?? RANK_RANGE_MIN;
              const maxRank = maxField.value ?? RANK_RANGE_DEFAULT_MAX;

              return (
                <FormItem>
                  <FormLabel>Rank restriction</FormLabel>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Use 1 for open-rank tournaments.
                  </p>
                  <Slider
                    className="mt-3"
                    min={RANK_SLIDER_MIN}
                    max={RANK_SLIDER_MAX}
                    step={RANK_SLIDER_STEP}
                    value={[
                      rankToSliderPosition(minRank),
                      rankToSliderPosition(maxRank),
                    ]}
                    onValueChange={(values) => {
                      const positions = [
                        rankToSliderPosition(minRank),
                        rankToSliderPosition(maxRank),
                      ];
                      const minDifference = Math.abs(values[0] - positions[0]);
                      const maxDifference = Math.abs(values[1] - positions[1]);
                      const changedThumb =
                        minDifference === maxDifference
                          ? activeRankThumb.current
                          : minDifference > maxDifference
                            ? 0
                            : 1;
                      activeRankThumb.current = changedThumb;

                      if (changedThumb === 0) {
                        minField.onChange(
                          Math.min(sliderPositionToRank(values[0]), maxRank)
                        );
                      } else {
                        maxField.onChange(
                          Math.max(sliderPositionToRank(values[1]), minRank)
                        );
                      }
                    }}
                    onValueCommit={(values) => {
                      if (activeRankThumb.current === 0) {
                        applyPatch({
                          minRankRange: Math.min(
                            sliderPositionToRank(values[0]),
                            maxRank
                          ),
                        });
                      } else {
                        applyPatch({
                          maxRankRange: Math.max(
                            sliderPositionToRank(values[1]),
                            minRank
                          ),
                        });
                      }
                    }}
                    minStepsBetweenThumbs={0}
                    data-testid="tournament-rank-slider"
                    getThumbProps={(index) => {
                      const thumbIndex: 0 | 1 = index === 0 ? 0 : 1;
                      const isMinimum = thumbIndex === 0;
                      const currentRank = isMinimum ? minRank : maxRank;

                      return {
                        'aria-label': isMinimum
                          ? 'Minimum rank'
                          : 'Maximum rank',
                        'aria-valuemin': isMinimum ? RANK_RANGE_MIN : minRank,
                        'aria-valuemax': isMinimum ? maxRank : RANK_RANGE_MAX,
                        'aria-valuenow': currentRank,
                        'aria-valuetext': currentRank.toLocaleString(),
                        onFocus: () => {
                          activeRankThumb.current = thumbIndex;
                        },
                        onPointerDown: () => {
                          activeRankThumb.current = thumbIndex;
                        },
                        onKeyDown: (event) => {
                          let nextRank: number | undefined;
                          const pageStep = event.shiftKey ? 10 : 1;

                          if (
                            event.key === 'ArrowRight' ||
                            event.key === 'ArrowUp'
                          ) {
                            nextRank = moveRankBySliderStops(
                              currentRank,
                              pageStep
                            );
                          } else if (
                            event.key === 'ArrowLeft' ||
                            event.key === 'ArrowDown'
                          ) {
                            nextRank = moveRankBySliderStops(
                              currentRank,
                              -pageStep
                            );
                          } else if (event.key === 'PageUp') {
                            nextRank = moveRankBySliderStops(currentRank, 10);
                          } else if (event.key === 'PageDown') {
                            nextRank = moveRankBySliderStops(currentRank, -10);
                          } else if (event.key === 'Home') {
                            nextRank = isMinimum ? RANK_RANGE_MIN : minRank;
                          } else if (event.key === 'End') {
                            nextRank = isMinimum ? maxRank : RANK_RANGE_MAX;
                          }

                          if (nextRank === undefined) return;
                          event.preventDefault();

                          if (isMinimum) {
                            const minRankRange = Math.min(nextRank, maxRank);
                            minField.onChange(minRankRange);
                            applyPatch({ minRankRange });
                          } else {
                            const maxRankRange = Math.max(nextRank, minRank);
                            maxField.onChange(maxRankRange);
                            applyPatch({ maxRankRange });
                          }
                        },
                      };
                    }}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="tournament-min-rank"
                        className="mb-1 block text-xs text-muted-foreground"
                      >
                        Minimum
                      </label>
                      <Input
                        id="tournament-min-rank"
                        type="number"
                        value={minRank}
                        min={RANK_RANGE_MIN}
                        max={maxRank}
                        onChange={(event) =>
                          minField.onChange(Number(event.target.value))
                        }
                        onBlur={(event) => {
                          const minRankRange = clamp(
                            Number(event.currentTarget.value) || RANK_RANGE_MIN,
                            RANK_RANGE_MIN,
                            maxRank
                          );
                          minField.onChange(minRankRange);
                          applyPatch({ minRankRange });
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="tournament-max-rank"
                        className="mb-1 block text-xs text-muted-foreground"
                      >
                        Maximum
                      </label>
                      <Input
                        id="tournament-max-rank"
                        type="number"
                        value={maxRank}
                        min={minRank}
                        max={RANK_RANGE_MAX}
                        onChange={(event) =>
                          maxField.onChange(Number(event.target.value))
                        }
                        onBlur={(event) => {
                          const maxRankRange = clamp(
                            Number(event.currentTarget.value) || RANK_RANGE_MAX,
                            minRank,
                            RANK_RANGE_MAX
                          );
                          maxField.onChange(maxRankRange);
                          applyPatch({ maxRankRange });
                        }}
                      />
                    </div>
                  </div>
                </FormItem>
              );
            }}
          />
        )}
      />

      <FormField
        control={control}
        name="dateMin"
        render={({ field: dateMinField }) => (
          <FormField
            control={control}
            name="dateMax"
            render={({ field: dateMaxField }) => (
              <FormItem>
                <FormLabel>Tournament dates</FormLabel>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="tournament-date-min"
                      className="mb-1 block text-xs text-muted-foreground"
                    >
                      From
                    </label>
                    <Input
                      id="tournament-date-min"
                      type="date"
                      value={toDateInputValue(dateMinField.value)}
                      max={toDateInputValue(dateMaxField.value)}
                      onChange={(event) => {
                        const dateMin = fromDateInputValue(event.target.value);
                        dateMinField.onChange(dateMin);
                        applyPatch({ dateMin });
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tournament-date-max"
                      className="mb-1 block text-xs text-muted-foreground"
                    >
                      Through
                    </label>
                    <Input
                      id="tournament-date-max"
                      type="date"
                      value={toDateInputValue(dateMaxField.value)}
                      min={toDateInputValue(dateMinField.value)}
                      onChange={(event) => {
                        const dateMax = fromDateInputValue(event.target.value);
                        dateMaxField.onChange(dateMax);
                        applyPatch({ dateMax });
                      }}
                    />
                  </div>
                </div>
              </FormItem>
            )}
          />
        )}
      />
    </div>
  );
}

function countAdvancedFilters(filter: FilterFormData): number {
  return [
    filter.verified,
    Boolean(filter.verificationStatus?.length),
    filter.rejectionReason !== undefined,
    Boolean(filter.lobbySize?.length),
    Boolean(filter.dateMin || filter.dateMax),
    filter.minRankRange !== undefined && filter.minRankRange !== RANK_RANGE_MIN,
    filter.maxRankRange !== undefined &&
      filter.maxRankRange !== RANK_RANGE_DEFAULT_MAX,
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

  if (
    (filter.minRankRange !== undefined &&
      filter.minRankRange !== RANK_RANGE_MIN) ||
    (filter.maxRankRange !== undefined &&
      filter.maxRankRange !== RANK_RANGE_DEFAULT_MAX)
  ) {
    filters.push({
      key: 'rank',
      label: `Rank: ${(filter.minRankRange ?? RANK_RANGE_MIN).toLocaleString()} – ${(filter.maxRankRange ?? RANK_RANGE_DEFAULT_MAX).toLocaleString()}`,
      clear: () =>
        applyPatch({
          minRankRange: RANK_RANGE_MIN,
          maxRankRange: RANK_RANGE_DEFAULT_MAX,
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
  const { searchQuery, debouncedQuery, handleSetQuery, isSynchronizing } =
    useSearchInput(filter.searchQuery ?? '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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

  const applyPatch = useCallback<ApplyFilterPatch>(
    (patch) => {
      const values = {
        ...form.getValues(),
        searchQuery,
        ...patch,
      } as FilterFormData;
      form.reset(values);
      submitValues(values);
    },
    [form, searchQuery, submitValues]
  );

  useEffect(() => {
    if (
      !isSynchronizing &&
      debouncedQuery === searchQuery &&
      debouncedQuery !== (filter.searchQuery ?? '')
    ) {
      applyPatch({ searchQuery: debouncedQuery });
    }
  }, [
    applyPatch,
    debouncedQuery,
    filter.searchQuery,
    isSynchronizing,
    searchQuery,
  ]);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        applyPatch({ searchQuery });
      }
    },
    [applyPatch, searchQuery]
  );

  const handleClearFilters = useCallback(() => {
    handleSetQuery('');
    form.reset({
      ...defaultTournamentListFilter,
      searchQuery: '',
    } as FilterFormData);
    router.push(pathname, { scroll: false });
    setIsFilterOpen(false);
  }, [form, handleSetQuery, pathname, router]);

  const currentFilter = form.watch();
  const activeFilterCount = countAdvancedFilters(currentFilter);

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
              <SortControls control={form.control} applyPatch={applyPatch} />
            </div>

            <div className="border-l pl-2 md:pl-4">
              <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <SheetTrigger asChild>
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
                </SheetTrigger>
                <SheetContent
                  aria-describedby={undefined}
                  className="w-full gap-0 sm:max-w-md dark:bg-popover"
                >
                  <SheetHeader className="border-b pr-12">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal
                        className="size-5 text-primary"
                        aria-hidden="true"
                      />
                      <SheetTitle>Filter tournaments</SheetTitle>
                    </div>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-4 pb-6">
                    <FilterPanel
                      control={form.control}
                      applyPatch={applyPatch}
                    />
                  </div>
                  <SheetFooter className="grid grid-cols-2 border-t bg-background dark:bg-muted">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearFilters}
                    >
                      <X aria-hidden="true" />
                      Clear all
                    </Button>
                    <SheetClose asChild>
                      <Button type="button">Done</Button>
                    </SheetClose>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
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
