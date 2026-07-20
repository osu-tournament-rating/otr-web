'use client';

import { Ruleset } from '@otr/core/osu';
import {
  ArrowDown,
  ArrowUp,
  Filter,
  LayoutGrid,
  Loader2,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import type { z } from 'zod';

import RulesetIcon from '@/components/icons/RulesetIcon';
import { Button } from '@/components/ui/button';
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
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BeatmapLayout } from '@/components/beatmaps/list/BeatmapListTable';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import type { BeatmapListSort } from '@/lib/orpc/schema/beatmapList';
import { cn } from '@/lib/utils';
import {
  beatmapListFilterSchema,
  defaultBeatmapListFilter,
} from '@/lib/validation-schema';

type FilterData = z.infer<typeof beatmapListFilterSchema>;
type FilterPatch = Partial<FilterData>;

interface BeatmapListFilterProps {
  filter: FilterData;
  layout: BeatmapLayout;
  onLayoutChange: (layout: BeatmapLayout) => void;
  totalCount: number;
}

const sortOptions: readonly { value: BeatmapListSort; label: string }[] = [
  { value: 'gameCount', label: 'Games' },
  { value: 'tournamentCount', label: 'Tournaments' },
  { value: 'sr', label: 'SR' },
  { value: 'bpm', label: 'BPM' },
  { value: 'length', label: 'Duration' },
  { value: 'creator', label: 'Mapper' },
  { value: 'cs', label: 'CS' },
  { value: 'ar', label: 'AR' },
  { value: 'od', label: 'OD' },
  { value: 'hp', label: 'HP' },
] as const;

const rangeDefinitions = [
  {
    key: 'sr',
    label: 'SR',
    minKey: 'minSr',
    maxKey: 'maxSr',
    min: 0,
    max: 15,
    step: 0.1,
  },
  {
    key: 'bpm',
    label: 'BPM',
    minKey: 'minBpm',
    maxKey: 'maxBpm',
    min: 0,
    max: 600,
    step: 1,
  },
  {
    key: 'length',
    label: 'Duration (seconds)',
    minKey: 'minLength',
    maxKey: 'maxLength',
    min: 0,
    max: 1800,
    step: 1,
  },
  {
    key: 'games',
    label: 'Games',
    minKey: 'minGameCount',
    maxKey: 'maxGameCount',
    min: 0,
    max: 10000,
    step: 1,
  },
  {
    key: 'tournaments',
    label: 'Tournaments',
    minKey: 'minTournamentCount',
    maxKey: 'maxTournamentCount',
    min: 0,
    max: 1000,
    step: 1,
  },
] as const;

const attributeDefinitions = [
  { key: 'cs', label: 'CS', minKey: 'minCs', maxKey: 'maxCs', max: 10 },
  { key: 'ar', label: 'AR', minKey: 'minAr', maxKey: 'maxAr', max: 11 },
  { key: 'od', label: 'OD', minKey: 'minOd', maxKey: 'maxOd', max: 11 },
  { key: 'hp', label: 'HP', minKey: 'minHp', maxKey: 'maxHp', max: 10 },
] as const;

const numericKeys = [
  'minSr',
  'maxSr',
  'minBpm',
  'maxBpm',
  'minCs',
  'maxCs',
  'minAr',
  'maxAr',
  'minOd',
  'maxOd',
  'minHp',
  'maxHp',
  'minLength',
  'maxLength',
  'minGameCount',
  'maxGameCount',
  'minTournamentCount',
  'maxTournamentCount',
] as const;

type NumericFilterKey = (typeof numericKeys)[number];

export function buildBeatmapSearchParams(filter: FilterData): URLSearchParams {
  const params = new URLSearchParams();

  if (filter.page && filter.page > 1) params.set('page', String(filter.page));
  if (filter.q?.trim()) params.set('q', filter.q.trim());
  if (filter.ruleset !== undefined)
    params.set('ruleset', String(filter.ruleset));

  for (const key of numericKeys) {
    const value = filter[key];
    if (value !== undefined && Number.isFinite(value)) {
      params.set(key, String(value));
    }
  }

  if (filter.sort !== defaultBeatmapListFilter.sort) {
    params.set('sort', filter.sort);
  }
  if (filter.descending !== defaultBeatmapListFilter.descending) {
    params.set('descending', String(filter.descending));
  }

  return params;
}

function countSheetFilters(filter: FilterData): number {
  return (
    (filter.ruleset === undefined ? 0 : 1) +
    rangeDefinitions.filter(
      ({ minKey, maxKey }) =>
        filter[minKey] !== undefined || filter[maxKey] !== undefined
    ).length +
    attributeDefinitions.filter(
      ({ minKey, maxKey }) =>
        filter[minKey] !== undefined || filter[maxKey] !== undefined
    ).length
  );
}

export default function BeatmapListFilter({
  filter,
  layout,
  onLayoutChange,
  totalCount,
}: BeatmapListFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(filter.q ?? '');
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<FilterData>(filter);

  useEffect(() => {
    setQuery(filter.q ?? '');
    setIsSearching(false);
    if (!isOpen) setDraft(filter);
  }, [filter, isOpen]);

  const navigate = useCallback(
    (next: FilterData) => {
      const params = buildBeatmapSearchParams({ ...next, page: undefined });
      const nextPath = params.size ? `${pathname}?${params}` : pathname;
      const currentPath = window.location.pathname + window.location.search;
      if (nextPath !== currentPath) router.push(nextPath, { scroll: false });
    },
    [pathname, router]
  );

  const applyPatch = useCallback(
    (patch: FilterPatch) => navigate({ ...filter, q: query, ...patch }),
    [filter, navigate, query]
  );

  useEffect(() => {
    if (query === (filter.q ?? '')) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = window.setTimeout(
      () => applyPatch({ q: query || undefined }),
      500
    );
    return () => window.clearTimeout(timeout);
  }, [applyPatch, filter.q, query]);

  const submitSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyPatch({ q: query || undefined });
  };

  const rulesets = useMemo(
    () =>
      Object.entries(RulesetEnumHelper.metadata)
        .filter(([value]) => Number(value) !== Ruleset.ManiaOther)
        .map(([value, metadata]) => ({
          value: Number(value) as Ruleset,
          label: metadata.text.replace('osu!', '').trim() || 'osu!',
        })),
    []
  );

  const clearSheetFilters = () => {
    const next = { ...draft };
    delete next.ruleset;
    for (const key of numericKeys) delete next[key];
    setDraft(next);
  };

  const clearAll = () => {
    setQuery('');
    navigate({
      sort: filter.sort,
      descending: filter.descending,
      q: '',
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:gap-4">
        <div className="relative min-w-0 flex-1">
          {isSearching ? (
            <Loader2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          )}
          <Input
            data-testid="beatmap-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value.trimStart())}
            onKeyDown={submitSearch}
            placeholder="Search title, artist, difficulty, mapper, or ID"
            aria-label="Search beatmaps"
            autoComplete="off"
            className="h-10 bg-background pr-3 pl-9 dark:bg-input/50 dark:shadow-none"
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:shrink-0 md:items-center md:gap-4 md:border-l md:pl-4">
          <div
            role="group"
            aria-label="Beatmap sorting"
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex"
          >
            <Select
              value={filter.sort}
              onValueChange={(value) =>
                applyPatch({ sort: value as BeatmapListSort })
              }
            >
              <SelectTrigger
                data-testid="beatmap-sort-select"
                aria-label="Sort beatmaps by"
                className="h-10 w-full min-w-0 bg-background md:w-48 dark:bg-input/50 dark:shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-testid="beatmap-sort-direction"
                  aria-label={`Sort order is ${filter.descending ? 'descending' : 'ascending'}`}
                  onClick={() => applyPatch({ descending: !filter.descending })}
                  className="size-10 bg-background dark:bg-input/50 dark:shadow-none"
                >
                  {filter.descending ? <ArrowDown /> : <ArrowUp />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {filter.descending ? 'Descending order' : 'Ascending order'}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex gap-2 border-l pl-2 md:pl-4">
            <Sheet
              open={isOpen}
              onOpenChange={(open) => {
                setIsOpen(open);
                if (open) setDraft(filter);
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button
                      data-testid="beatmap-filter-button"
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Filters${countSheetFilters(filter) > 0 ? `, ${countSheetFilters(filter)} active` : ''}`}
                      className="relative size-10 bg-background dark:bg-input/50 dark:shadow-none"
                    >
                      <Filter aria-hidden="true" />
                      {countSheetFilters(filter) > 0 && (
                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] leading-none text-primary-foreground shadow-xs">
                          {countSheetFilters(filter)}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent>Filters</TooltipContent>
              </Tooltip>
              <SheetContent
                data-testid="beatmap-filter-popover"
                className="w-full gap-0 sm:max-w-md"
              >
                <SheetHeader className="border-b px-5 py-4">
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="size-5 text-primary" />
                    Filter beatmaps
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Set ruleset, beatmap, and tournament usage filters.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
                  <fieldset className="md:hidden">
                    <legend className="mb-3 text-sm font-medium">
                      Ruleset
                    </legend>
                    <div
                      data-testid="beatmap-ruleset-filters-mobile"
                      className="grid grid-cols-2 gap-1.5 min-[400px]:grid-cols-3"
                    >
                      <RulesetChip
                        large
                        label="All"
                        value="all"
                        selected={draft.ruleset === undefined}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            ruleset: undefined,
                          }))
                        }
                      />
                      {rulesets.map((ruleset) => (
                        <RulesetChip
                          large
                          key={ruleset.value}
                          label={ruleset.label}
                          value={ruleset.value}
                          selected={draft.ruleset === ruleset.value}
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              ruleset: ruleset.value,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-5">
                    {rangeDefinitions.map((definition) => (
                      <RangeInputs
                        key={definition.key}
                        label={definition.label}
                        min={definition.min}
                        max={definition.max}
                        step={definition.step}
                        minValue={draft[definition.minKey]}
                        maxValue={draft[definition.maxKey]}
                        onMinChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            [definition.minKey]: value,
                          }))
                        }
                        onMaxChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            [definition.maxKey]: value,
                          }))
                        }
                      />
                    ))}
                  </div>

                  <fieldset>
                    <legend className="mb-3 text-sm font-medium">
                      Map attributes
                    </legend>
                    <div className="grid grid-cols-2 gap-4">
                      {attributeDefinitions.map((definition) => (
                        <RangeInputs
                          key={definition.key}
                          compact
                          label={definition.label}
                          min={0}
                          max={definition.max}
                          step={0.1}
                          minValue={draft[definition.minKey]}
                          maxValue={draft[definition.maxKey]}
                          onMinChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              [definition.minKey]: value,
                            }))
                          }
                          onMaxChange={(value) =>
                            setDraft((current) => ({
                              ...current,
                              [definition.maxKey]: value,
                            }))
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                </div>

                <SheetFooter className="grid grid-cols-2 border-t p-4">
                  <Button
                    data-testid="beatmap-filter-clear"
                    type="button"
                    variant="outline"
                    onClick={clearSheetFilters}
                  >
                    <X aria-hidden="true" />
                    Clear
                  </Button>
                  <Button
                    data-testid="beatmap-filter-apply"
                    type="button"
                    onClick={() => {
                      navigate({ ...draft, q: query, page: undefined });
                      setIsOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-testid="beatmap-layout-toggle"
                  data-layout={layout}
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={
                    layout === 'cards'
                      ? 'Switch to compact view'
                      : 'Switch to card view'
                  }
                  aria-pressed={layout === 'compact'}
                  onClick={() =>
                    onLayoutChange(layout === 'cards' ? 'compact' : 'cards')
                  }
                  className="size-10 bg-background dark:bg-input/50 dark:shadow-none"
                >
                  {layout === 'cards' ? (
                    <LayoutGrid aria-hidden="true" />
                  ) : (
                    <Rows3 aria-hidden="true" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {layout === 'cards'
                  ? 'Switch to compact view'
                  : 'Switch to card view'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end md:justify-between">
        <div
          data-testid="beatmap-ruleset-filters-desktop"
          aria-label="Filter by ruleset"
          className="hidden flex-wrap gap-1.5 md:flex"
        >
          <RulesetChip
            label="All"
            value="all"
            selected={filter.ruleset === undefined}
            onClick={() => applyPatch({ ruleset: undefined })}
          />
          {rulesets.map((ruleset) => (
            <RulesetChip
              key={ruleset.value}
              label={ruleset.label}
              value={ruleset.value}
              selected={filter.ruleset === ruleset.value}
              onClick={() => applyPatch({ ruleset: ruleset.value })}
            />
          ))}
        </div>
        <span
          className="shrink-0 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {totalCount.toLocaleString()} maps
        </span>
      </div>

      <ActiveFilterSummary
        filter={filter}
        onRemove={(keys) => {
          const patch: FilterPatch = {};
          for (const key of keys) patch[key] = undefined;
          applyPatch(patch);
        }}
        onClearAll={clearAll}
      />
    </div>
  );
}

function RulesetChip({
  label,
  value,
  selected,
  onClick,
  large = false,
}: {
  label: string;
  value: Ruleset | 'all';
  selected: boolean;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-8 flex-none gap-1.5 rounded-full bg-background px-3 dark:bg-input/50 dark:shadow-none',
        large && 'h-10 w-full gap-2 px-3 text-base has-[>svg]:px-3',
        selected &&
          'border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/25'
      )}
    >
      <RulesetIcon
        ruleset={value}
        className={cn('fill-current', large ? 'size-5' : 'size-4')}
        aria-hidden="true"
      />
      {label}
    </Button>
  );
}

function RangeInputs({
  label,
  min,
  max,
  step,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  compact = false,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value?: number) => void;
  onMaxChange: (value?: number) => void;
  compact?: boolean;
}) {
  const parse = (value: string) => {
    if (!value) return undefined;
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.min(Math.max(number, min), max)
      : undefined;
  };

  return (
    <fieldset className="min-w-0">
      <legend className={cn('mb-2 text-sm font-medium', compact && 'text-xs')}>
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="min-w-0">
          <span className="mb-1 block text-xs text-muted-foreground">Min</span>
          <Input
            type="number"
            inputMode="decimal"
            value={minValue ?? ''}
            placeholder={String(min)}
            min={min}
            max={maxValue ?? max}
            step={step}
            onChange={(event) => onMinChange(parse(event.target.value))}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs text-muted-foreground">Max</span>
          <Input
            type="number"
            inputMode="decimal"
            value={maxValue ?? ''}
            placeholder={String(max)}
            min={minValue ?? min}
            max={max}
            step={step}
            onChange={(event) => onMaxChange(parse(event.target.value))}
          />
        </label>
      </div>
    </fieldset>
  );
}

function ActiveFilterSummary({
  filter,
  onRemove,
  onClearAll,
}: {
  filter: FilterData;
  onRemove: (keys: NumericFilterKey[]) => void;
  onClearAll: () => void;
}) {
  const filters = [...rangeDefinitions, ...attributeDefinitions]
    .filter(
      ({ minKey, maxKey }) =>
        filter[minKey] !== undefined || filter[maxKey] !== undefined
    )
    .map(({ key, label, minKey, maxKey }) => ({
      key,
      label: `${label}: ${filter[minKey] ?? 'Any'} – ${filter[maxKey] ?? 'Any'}`,
      keys: [minKey, maxKey] as NumericFilterKey[],
    }));

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
          onClick={() => onRemove(activeFilter.keys)}
          aria-label={`Remove ${activeFilter.label} filter`}
          className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs transition-colors hover:border-primary/50 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/50"
        >
          <span className="min-w-0 text-left break-words">
            {activeFilter.label}
          </span>
          <X className="size-3 shrink-0" aria-hidden="true" />
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
