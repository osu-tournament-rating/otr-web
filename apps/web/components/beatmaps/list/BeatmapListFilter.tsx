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
  Table2,
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

import FilterChip from '@/components/filters/FilterChip';
import FilterPopover, {
  type FilterField,
} from '@/components/filters/FilterPopover';
import { useDeferredFilterApply } from '@/components/filters/useDeferredFilterApply';
import RulesetIcon from '@/components/icons/RulesetIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  BEATMAP_LAYOUTS,
  isBeatmapLayout,
  type BeatmapLayout,
} from '@/components/beatmaps/list/layout';
import {
  buildBeatmapSearchParams,
  minBeatmapSearchLength,
  normalizeBeatmapSearchQuery,
  beatmapListNumericKeys as numericKeys,
  type BeatmapListNumericKey as NumericFilterKey,
  type BeatmapListSortKey,
} from '@/lib/beatmaps/list-params';
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { tieredScale, type NumericScale } from '@/lib/filters/scale';
import { formatDuration } from '@/lib/utils/date';
import type { beatmapListFilterSchema } from '@/lib/validation-schema';

type FilterData = z.infer<typeof beatmapListFilterSchema>;
type FilterPatch = Partial<FilterData>;

interface BeatmapListFilterProps {
  filter: FilterData;
  layout: BeatmapLayout;
  onLayoutChange: (layout: BeatmapLayout) => void;
  totalCount: number;
}

const primarySortOptions: readonly {
  value: BeatmapListSortKey;
  label: string;
}[] = [
  { value: 'gameCount', label: 'Games' },
  { value: 'tournamentCount', label: 'Tournaments' },
];

const attributeSortOptions: readonly {
  value: BeatmapListSortKey;
  label: string;
}[] = [
  { value: 'sr', label: 'SR' },
  { value: 'bpm', label: 'BPM' },
  { value: 'cs', label: 'CS' },
  { value: 'ar', label: 'AR' },
  { value: 'length', label: 'Length' },
];

const layoutOptions: Record<
  BeatmapLayout,
  { label: string; icon: typeof LayoutGrid }
> = {
  cards: { label: 'Card view', icon: LayoutGrid },
  compact: { label: 'Compact view', icon: Rows3 },
  table: { label: 'Table view', icon: Table2 },
};

interface BeatmapRangeField {
  id: string;
  label: string;
  minKey: NumericFilterKey;
  maxKey: NumericFilterKey;
  min: number;
  max: number;
  step?: number;
  scale?: NumericScale;
  span?: 'half';
  valueLabel?: string;
  format?: (value: number) => string;
}

// Bounds and scales follow the real distribution, not the column types.
const rangeFields: readonly BeatmapRangeField[] = [
  {
    id: 'sr',
    label: 'SR',
    minKey: 'minSr',
    maxKey: 'maxSr',
    min: 0,
    max: 15,
    step: 0.1,
  },
  {
    id: 'bpm',
    label: 'BPM',
    minKey: 'minBpm',
    maxKey: 'maxBpm',
    min: 0,
    max: 600,
    step: 1,
  },
  {
    id: 'length',
    label: 'Length (seconds)',
    valueLabel: 'length',
    format: formatDuration,
    minKey: 'minLength',
    maxKey: 'maxLength',
    min: 0,
    max: 1800,
    scale: tieredScale({
      tiers: [
        { start: 0, end: 300, step: 5 },
        { start: 300, end: 600, step: 10 },
        { start: 600, end: 1800, step: 60 },
      ],
    }),
  },
  {
    id: 'games',
    label: 'Games',
    minKey: 'minGameCount',
    maxKey: 'maxGameCount',
    min: 0,
    max: 600,
    scale: tieredScale({
      tiers: [
        { start: 0, end: 50, step: 1 },
        { start: 50, end: 200, step: 5 },
        { start: 200, end: 600, step: 25 },
      ],
    }),
  },
  {
    id: 'tournaments',
    label: 'Tournaments',
    minKey: 'minTournamentCount',
    maxKey: 'maxTournamentCount',
    min: 0,
    max: 80,
    scale: tieredScale({
      tiers: [
        { start: 0, end: 30, step: 1 },
        { start: 30, end: 80, step: 5 },
      ],
    }),
  },
  {
    id: 'cs',
    label: 'CS',
    minKey: 'minCs',
    maxKey: 'maxCs',
    min: 0,
    max: 10,
    step: 0.1,
    span: 'half',
  },
  {
    id: 'ar',
    label: 'AR',
    minKey: 'minAr',
    maxKey: 'maxAr',
    min: 0,
    max: 10,
    step: 0.1,
    span: 'half',
  },
  {
    id: 'od',
    label: 'OD',
    minKey: 'minOd',
    maxKey: 'maxOd',
    min: 0,
    max: 10,
    step: 0.1,
    span: 'half',
  },
  {
    id: 'hp',
    label: 'HP',
    minKey: 'minHp',
    maxKey: 'maxHp',
    min: 0,
    max: 10,
    step: 0.1,
    span: 'half',
  },
];

function countActiveFilters(filter: FilterData): number {
  return (
    (filter.ruleset === undefined ? 0 : 1) +
    rangeFields.filter(
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
  // Optimistic copy the controls read while a navigation is in flight.
  const [pending, setPending] = useState<FilterData | null>(null);
  const currentFilter = pending ?? filter;

  // Resync the box from the URL on external navigation.
  useEffect(() => {
    setQuery((current) =>
      normalizeBeatmapSearchQuery(current) ===
      normalizeBeatmapSearchQuery(filter.q)
        ? current
        : (filter.q ?? '')
    );
    setIsSearching(false);
  }, [filter.q]);

  // Serialized, not the prop: a parent render can hand back a fresh object mid-edit.
  const filterKey = useMemo(
    () => buildBeatmapSearchParams({ ...filter, page: undefined }).toString(),
    [filter]
  );

  useEffect(() => {
    setPending(null);
  }, [filterKey]);

  const navigate = useCallback(
    (next: FilterData) => {
      const params = buildBeatmapSearchParams({ ...next, page: undefined });
      const nextPath = params.size ? `${pathname}?${params}` : pathname;
      const currentPath = window.location.pathname + window.location.search;
      if (nextPath !== currentPath) {
        router.push(nextPath, { scroll: false });
      } else {
        // No prop change will arrive to clear these.
        setIsSearching(false);
        setPending(null);
      }
    },
    [pathname, router]
  );

  const { schedule, applyNow } = useDeferredFilterApply(navigate);

  const applyPatch = useCallback(
    (patch: FilterPatch, immediate = false) => {
      const next = { ...currentFilter, q: query, ...patch };
      setPending(next);
      (immediate ? applyNow : schedule)(next);
    },
    [applyNow, currentFilter, query, schedule]
  );

  const changeQuery = (value: string) => {
    const next = value.trimStart();
    setQuery(next);
    setIsSearching(
      normalizeBeatmapSearchQuery(next) !==
        normalizeBeatmapSearchQuery(filter.q)
    );
    schedule({ ...currentFilter, q: next });
  };

  const submitSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applyPatch({ q: query || undefined }, true);
  };

  const belowMinimumQuery =
    query.trim().length > 0 && normalizeBeatmapSearchQuery(query) === undefined;

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

  const fields = useMemo<FilterField[]>(
    () => [
      {
        kind: 'chip-group',
        id: 'ruleset-filters-mobile',
        label: 'Ruleset',
        className: 'md:hidden',
        value: currentFilter.ruleset,
        onChange: (value) => applyPatch({ ruleset: value }),
        options: [
          {
            key: 'all',
            label: 'All',
            icon: (
              <RulesetIcon
                ruleset="all"
                className="size-4 fill-current"
                aria-hidden="true"
              />
            ),
          },
          ...rulesets.map((ruleset) => ({
            key: String(ruleset.value),
            value: ruleset.value,
            label: ruleset.label,
            icon: (
              <RulesetIcon
                ruleset={ruleset.value}
                className="size-4 fill-current"
                aria-hidden="true"
              />
            ),
          })),
        ],
      },
      ...rangeFields.map((field): FilterField => ({
        kind: 'range',
        id: field.id,
        label: field.label,
        span: field.span,
        min: field.min,
        max: field.max,
        step: field.step,
        scale: field.scale,
        valueLabel: field.valueLabel,
        format: field.format,
        value: {
          min: currentFilter[field.minKey],
          max: currentFilter[field.maxKey],
        },
        onChange: (next) => {
          const patch: FilterPatch = {};
          patch[field.minKey] = next.min;
          patch[field.maxKey] = next.max;
          applyPatch(patch);
        },
      })),
    ],
    [applyPatch, currentFilter, rulesets]
  );

  const clearFilters = () => {
    const patch: FilterPatch = { ruleset: undefined };
    for (const key of numericKeys) patch[key] = undefined;
    applyPatch(patch, true);
  };

  const clearAll = () => {
    setQuery('');
    const cleared: FilterData = {
      sort: currentFilter.sort,
      descending: currentFilter.descending,
      q: '',
    };
    setPending(cleared);
    applyNow(cleared);
  };

  const activeCount = countActiveFilters(currentFilter);

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
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={submitSearch}
            placeholder="Search title, artist, difficulty, mapper, or ID"
            aria-label="Search beatmaps"
            maxLength={200}
            aria-describedby={
              belowMinimumQuery ? 'beatmap-search-minimum-hint' : undefined
            }
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
              value={currentFilter.sort}
              // Sorting is not a filter; it applies at once.
              onValueChange={(value) =>
                applyPatch({ sort: value as BeatmapListSortKey }, true)
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
                {primarySortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                <SelectSeparator />
                {attributeSortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SimpleTooltip
              content={
                currentFilter.descending
                  ? 'Descending order'
                  : 'Ascending order'
              }
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                data-testid="beatmap-sort-direction"
                aria-label={`Sort order is ${currentFilter.descending ? 'descending' : 'ascending'}`}
                onClick={() =>
                  applyPatch({ descending: !currentFilter.descending }, true)
                }
                className="size-10 bg-background dark:bg-input/50 dark:shadow-none"
              >
                {currentFilter.descending ? <ArrowDown /> : <ArrowUp />}
              </Button>
            </SimpleTooltip>
          </div>

          <div className="flex gap-2 border-l pl-2 md:pl-4">
            <FilterPopover
              title="Filter beatmaps"
              testIdPrefix="beatmap"
              fields={fields}
              activeCount={activeCount}
              onClearAll={clearFilters}
            >
              <Button
                data-testid="beatmap-filter-button"
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Filters${activeCount > 0 ? `, ${activeCount} active` : ''}`}
                className="relative size-10 bg-background dark:bg-input/50 dark:shadow-none"
              >
                <Filter aria-hidden="true" />
                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs leading-none text-primary-foreground shadow-xs">
                    {activeCount}
                  </span>
                )}
              </Button>
            </FilterPopover>
          </div>
        </div>
      </div>

      {belowMinimumQuery && (
        <p
          id="beatmap-search-minimum-hint"
          data-testid="beatmap-search-minimum-hint"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          Keep typing — search starts at {minBeatmapSearchLength} characters.
        </p>
      )}

      <div className="flex items-center justify-end gap-3 md:justify-between">
        <div
          data-testid="beatmap-ruleset-filters-desktop"
          aria-label="Filter by ruleset"
          className="hidden flex-wrap gap-1.5 md:flex"
        >
          <FilterChip
            label="All"
            icon={
              <RulesetIcon
                ruleset="all"
                className="size-4 fill-current"
                aria-hidden="true"
              />
            }
            selected={currentFilter.ruleset === undefined}
            onClick={() => applyPatch({ ruleset: undefined })}
          />
          {rulesets.map((ruleset) => (
            <FilterChip
              key={ruleset.value}
              label={ruleset.label}
              icon={
                <RulesetIcon
                  ruleset={ruleset.value}
                  className="size-4 fill-current"
                  aria-hidden="true"
                />
              }
              selected={currentFilter.ruleset === ruleset.value}
              onClick={() => applyPatch({ ruleset: ruleset.value })}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            value={layout}
            // Radix emits '' when the active item is re-clicked.
            onValueChange={(value) => {
              if (isBeatmapLayout(value)) onLayoutChange(value);
            }}
            role="radiogroup"
            aria-label="Beatmap layout"
            data-testid="beatmap-layout-toggle"
            data-layout={layout}
          >
            {/* No tooltips: a TooltipTrigger's `data-state` replaces the item's `on`/`off` */}
            {BEATMAP_LAYOUTS.map((value) => {
              const { label, icon: Icon } = layoutOptions[value];

              return (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  aria-label={label}
                  data-testid={`beatmap-layout-${value}`}
                  // Radios: arrow-key focus has to select.
                  onFocus={() => onLayoutChange(value)}
                  className="size-10 first:rounded-l-md last:rounded-r-md data-[state=off]:bg-background data-[state=on]:bg-primary/10 data-[state=on]:text-primary dark:data-[state=off]:bg-input/50 dark:data-[state=on]:bg-primary/20"
                >
                  <Icon aria-hidden="true" />
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          <span
            className="shrink-0 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {totalCount.toLocaleString()} maps
          </span>
        </div>
      </div>

      <ActiveFilterSummary
        filter={currentFilter}
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

function ActiveFilterSummary({
  filter,
  onRemove,
  onClearAll,
}: {
  filter: FilterData;
  onRemove: (keys: NumericFilterKey[]) => void;
  onClearAll: () => void;
}) {
  const filters = rangeFields
    .filter(
      ({ minKey, maxKey }) =>
        filter[minKey] !== undefined || filter[maxKey] !== undefined
    )
    .map(({ id, label, minKey, maxKey }) => ({
      key: id,
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
