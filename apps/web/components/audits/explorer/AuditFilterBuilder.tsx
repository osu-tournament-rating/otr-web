'use client';

import { Search, User, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import AuditEntityBadge from '../AuditEntityBadge';

export interface AuditExplorerFilter {
  searchQuery?: string;
  changedProperties?: PropertyFilter[];
  userActionsOnly?: boolean;
  selectedTournamentId?: number;
}

interface AuditFilterBuilderProps {
  filter: AuditExplorerFilter;
  filterOptions: { properties: FilterProperty[] };
}

function serializePropertyFilters(filters: PropertyFilter[]): string {
  return filters.map((f) => `${f.property}:${f.entityType}`).join(',');
}

export default function AuditFilterBuilder({
  filter,
  filterOptions,
}: AuditFilterBuilderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filter.searchQuery ?? '');
  const [propertyOpen, setPropertyOpen] = useState(false);

  const debouncedSearchValue = useDebounce(searchValue, 300);

  const updateUrl = useCallback(
    (updates: Partial<AuditExplorerFilter>) => {
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

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handlePropertyToggle = (prop: FilterProperty) => {
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

    updateUrl({ changedProperties: updated.length > 0 ? updated : undefined });
  };

  const isPropertySelected = (prop: FilterProperty): boolean => {
    return (filter.changedProperties ?? []).some(
      (p) => p.property === prop.name && p.entityType === prop.entityType
    );
  };

  const handleUserActionsToggle = () => {
    updateUrl({ userActionsOnly: !filter.userActionsOnly });
  };

  const handleClearProperty = useCallback(
    (property: string, entityType: number) => {
      const updated = (filter.changedProperties ?? []).filter(
        (p) => !(p.property === property && p.entityType === entityType)
      );
      updateUrl({
        changedProperties: updated.length > 0 ? updated : undefined,
      });
    },
    [filter.changedProperties, updateUrl]
  );

  const handleClearAll = () => {
    setSearchValue('');
    updateUrl({
      searchQuery: undefined,
      changedProperties: undefined,
      userActionsOnly: undefined,
    });
  };

  const activeFilters = useMemo(() => {
    const filters: {
      type: string;
      label: string;
      value: string;
      entityType?: number;
      onRemove: () => void;
    }[] = [];

    if (filter.searchQuery) {
      filters.push({
        type: 'search',
        label: 'Search',
        value: filter.searchQuery,
        onRemove: () => {
          setSearchValue('');
          updateUrl({ searchQuery: undefined });
        },
      });
    }

    (filter.changedProperties ?? []).forEach((prop) => {
      filters.push({
        type: 'property',
        label: 'Property',
        value: prop.property,
        entityType: prop.entityType,
        onRemove: () => handleClearProperty(prop.property, prop.entityType),
      });
    });

    if (filter.userActionsOnly) {
      filters.push({
        type: 'user',
        label: 'User Actions',
        value: 'Only',
        onRemove: () => updateUrl({ userActionsOnly: undefined }),
      });
    }

    return filters;
  }, [filter, updateUrl, handleClearProperty]);

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search tournaments..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover open={propertyOpen} onOpenChange={setPropertyOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Property Filter
              {(filter.changedProperties?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filter.changedProperties?.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search properties..." />
              <CommandList>
                <CommandEmpty>No properties found.</CommandEmpty>
                <CommandGroup>
                  {filterOptions.properties.slice(0, 50).map((prop) => (
                    <CommandItem
                      key={`${prop.name}-${prop.entityType}`}
                      onSelect={() => handlePropertyToggle(prop)}
                    >
                      <Checkbox
                        checked={isPropertySelected(prop)}
                        className="mr-2"
                      />
                      <span className="flex-1">{prop.name}</span>
                      <AuditEntityBadge entityType={prop.entityType} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          variant={filter.userActionsOnly ? 'default' : 'outline'}
          size="sm"
          onClick={handleUserActionsToggle}
        >
          <User className="mr-1.5 h-3.5 w-3.5" />
          User Actions
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((af, idx) => (
            <Badge
              key={`${af.type}-${af.value}-${af.entityType ?? ''}-${idx}`}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-muted-foreground text-xs">{af.label}:</span>
              <span>{af.value}</span>
              {af.entityType !== undefined && (
                <AuditEntityBadge entityType={af.entityType} />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                onClick={af.onRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
