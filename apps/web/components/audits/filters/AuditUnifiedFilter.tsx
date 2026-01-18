'use client';

import { Filter, Search, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useDebounce } from '@uidotdev/usehooks';

import { FilterProperty, PropertyFilter } from '@/lib/orpc/schema/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

import ActorFilter from './ActorFilter';
import DateRangeFilter from './DateRangeFilter';
import PropertyFilterSection from './PropertyFilterSection';

export interface AuditFilterState {
  searchQuery?: string;
  changedProperties?: PropertyFilter[];
  userActionsOnly?: boolean;
  activityAfter?: string;
  activityBefore?: string;
  actionUserId?: number;
  selectedTournamentId?: number;
}

interface AuditUnifiedFilterProps {
  filter: AuditFilterState;
  filterOptions: { properties: FilterProperty[] };
}

function serializePropertyFilters(filters: PropertyFilter[]): string {
  return filters.map((f) => `${f.property}:${f.entityType}`).join(',');
}

export default function AuditUnifiedFilter({
  filter,
  filterOptions,
}: AuditUnifiedFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filter.searchQuery ?? '');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const debouncedSearchValue = useDebounce(searchValue, 300);

  const updateUrl = useCallback(
    (updates: Partial<AuditFilterState>) => {
      const params = new URLSearchParams();
      const newFilter = { ...filter, ...updates };

      if (newFilter.searchQuery) {
        params.set('q', newFilter.searchQuery);
      }
      if (newFilter.changedProperties?.length) {
        params.set(
          'props',
          serializePropertyFilters(newFilter.changedProperties)
        );
      }
      if (newFilter.userActionsOnly) {
        params.set('userOnly', 'true');
      }
      if (newFilter.selectedTournamentId) {
        params.set('tid', newFilter.selectedTournamentId.toString());
      }
      if (newFilter.activityAfter) {
        params.set('after', newFilter.activityAfter);
      }
      if (newFilter.activityBefore) {
        params.set('before', newFilter.activityBefore);
      }
      if (newFilter.actionUserId) {
        params.set('actor', newFilter.actionUserId.toString());
      }

      const queryString = params.toString();
      startTransition(() => {
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
      });
    },
    [filter, pathname, router]
  );

  useEffect(() => {
    const newQuery = debouncedSearchValue || undefined;
    if (newQuery !== filter.searchQuery) {
      updateUrl({ searchQuery: newQuery });
    }
  }, [debouncedSearchValue, filter.searchQuery, updateUrl]);

  const handlePropertyToggle = useCallback(
    (prop: FilterProperty) => {
      const current = filter.changedProperties ?? [];
      const existingIndex = current.findIndex(
        (p) => p.property === prop.name && p.entityType === prop.entityType
      );

      let updated: PropertyFilter[];
      if (existingIndex >= 0) {
        updated = current.filter((_, i) => i !== existingIndex);
      } else {
        updated = [
          ...current,
          { property: prop.name, entityType: prop.entityType },
        ];
      }

      updateUrl({
        changedProperties: updated.length > 0 ? updated : undefined,
      });
    },
    [filter.changedProperties, updateUrl]
  );

  const handleDateRangeChange = useCallback(
    (after: string | undefined, before: string | undefined) => {
      updateUrl({ activityAfter: after, activityBefore: before });
    },
    [updateUrl]
  );

  const handleActorChange = useCallback(
    (actorId: number | undefined) => {
      updateUrl({ actionUserId: actorId });
    },
    [updateUrl]
  );

  const handleUserActionsToggle = useCallback(() => {
    updateUrl({ userActionsOnly: !filter.userActionsOnly });
  }, [filter.userActionsOnly, updateUrl]);

  const handleClearAll = useCallback(() => {
    setSearchValue('');
    updateUrl({
      searchQuery: undefined,
      changedProperties: undefined,
      userActionsOnly: undefined,
      activityAfter: undefined,
      activityBefore: undefined,
      actionUserId: undefined,
    });
  }, [updateUrl]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.changedProperties?.length)
      count += filter.changedProperties.length;
    if (filter.userActionsOnly) count += 1;
    if (filter.activityAfter || filter.activityBefore) count += 1;
    if (filter.actionUserId) count += 1;
    return count;
  }, [filter]);

  const hasActiveFilters = activeFilterCount > 0 || !!filter.searchQuery;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search tournaments..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-medium">
                Properties
              </Label>
              <PropertyFilterSection
                properties={filterOptions.properties}
                selectedProperties={filter.changedProperties ?? []}
                onPropertyToggle={handlePropertyToggle}
              />
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block text-sm font-medium">
                Date Range
              </Label>
              <DateRangeFilter
                activityAfter={filter.activityAfter}
                activityBefore={filter.activityBefore}
                onChange={handleDateRangeChange}
              />
            </div>

            <Separator />

            <div>
              <Label className="mb-2 block text-sm font-medium">
                Changed By
              </Label>
              <ActorFilter
                actorId={filter.actionUserId}
                onChange={handleActorChange}
              />
            </div>

            <Separator />

            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={filter.userActionsOnly ?? false}
                onCheckedChange={handleUserActionsToggle}
              />
              <span className="text-sm font-medium">User actions only</span>
            </label>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll}>
          <X className="mr-1.5 size-4" />
          Clear All
        </Button>
      )}
    </div>
  );
}
