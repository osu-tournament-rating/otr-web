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

import { FilterProperty } from '@/lib/orpc/schema/audit';
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
  changedProperties?: string[];
  userActionsOnly?: boolean;
  selectedTournamentId?: number;
}

interface AuditFilterBuilderProps {
  filter: AuditExplorerFilter;
  filterOptions: { properties: FilterProperty[] };
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
        params.set('props', newFilter.changedProperties.join(','));
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

  const handlePropertyToggle = (property: string) => {
    const current = filter.changedProperties ?? [];
    const updated = current.includes(property)
      ? current.filter((p) => p !== property)
      : [...current, property];
    updateUrl({ changedProperties: updated.length > 0 ? updated : undefined });
  };

  const handleUserActionsToggle = () => {
    updateUrl({ userActionsOnly: !filter.userActionsOnly });
  };

  const handleClearProperty = useCallback(
    (property: string) => {
      const updated = (filter.changedProperties ?? []).filter(
        (p) => p !== property
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
        value: prop,
        onRemove: () => handleClearProperty(prop),
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
                      key={prop.name}
                      onSelect={() => handlePropertyToggle(prop.name)}
                    >
                      <Checkbox
                        checked={(filter.changedProperties ?? []).includes(
                          prop.name
                        )}
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
              key={`${af.type}-${af.value}-${idx}`}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-muted-foreground text-xs">{af.label}:</span>
              <span>{af.value}</span>
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
