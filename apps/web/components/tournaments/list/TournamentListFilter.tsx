'use client';

import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  defaultTournamentListFilter,
  tournamentListFilterSchema,
} from '@/lib/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useForm, Control } from 'react-hook-form';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Ruleset, TournamentQuerySortType } from '@otr/core/osu';
import { usePathname, useRouter } from 'next/navigation';
import { TournamentListFilter as TournamentListFilterType } from '@/lib/types';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { RulesetEnumHelper } from '@/lib/enums';
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

const DEBOUNCE_DELAY = 500;

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

type FilterFormData = z.infer<typeof tournamentListFilterSchema>;

interface TournamentListFilterProps {
  filter: FilterFormData;
}

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

const useUrlSync = (watchedValues: FilterFormData) => {
  const pathName = usePathname();
  const router = useRouter();
  const lastPushedUrl = useRef<string>('');

  useEffect(() => {
    const searchParams = new URLSearchParams();

    Object.entries(watchedValues).forEach(([key, value]) => {
      const filterKey = key as keyof TournamentListFilterType;

      if (
        value === undefined ||
        defaultTournamentListFilter[filterKey] === value ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        return;
      }

      if (value instanceof Date) {
        searchParams.set(filterKey, value.toISOString().split('T')[0]);
      } else {
        searchParams.set(filterKey, String(value));
      }
    });

    const queryString = searchParams.toString();
    const newPath = queryString ? `${pathName}?${queryString}` : pathName;
    const currentUrl = window.location.pathname + window.location.search;

    if (currentUrl !== newPath && lastPushedUrl.current !== newPath) {
      lastPushedUrl.current = newPath;
      router.push(newPath, { scroll: false });
    }
  }, [watchedValues, router, pathName]);
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
  <div className="relative w-full">
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
              placeholder="Type to search for tournaments..."
              type="search"
              className="border-border bg-card focus:border-primary h-12 rounded-lg border-2 pl-10 text-base"
              onKeyDown={onKeyDown}
            />
          </FormControl>
        </FormItem>
      )}
    />
    <Search className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform" />
  </div>
);

const RulesetFilter = ({ control }: { control: Control<FilterFormData> }) => {
  const availableRulesets = useMemo(
    () =>
      Object.entries(RulesetEnumHelper.metadata).filter(
        ([ruleset]) => Number(ruleset) !== Ruleset.ManiaOther
      ),
    []
  );

  return (
    <FormField
      control={control}
      name="ruleset"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="flex w-full flex-wrap gap-2">
              {availableRulesets.map(([ruleset, { text }]) => {
                const rulesetNumber = Number(ruleset) as Ruleset;
                const isSelected = field.value === rulesetNumber;

                return (
                  <Button
                    key={`ruleset-${ruleset}`}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() =>
                      field.onChange(isSelected ? undefined : rulesetNumber)
                    }
                    className="flex-auto"
                  >
                    <RulesetIcon
                      ruleset={rulesetNumber}
                      className="mr-2 size-5"
                      fill="currentColor"
                    />
                    {text}
                  </Button>
                );
              })}
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
};

const SortControls = ({ control }: { control: Control<FilterFormData> }) => (
  <div className="flex items-center gap-2">
    <FormField
      control={control}
      name="sort"
      render={({ field }) => (
        <FormItem className="flex-grow">
          <Select
            value={String(field.value)}
            onValueChange={(val) => field.onChange(Number(val))}
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
                  onClick={() => field.onChange(!field.value)}
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

export default function TournamentListFilter({
  filter,
}: TournamentListFilterProps) {
  const { searchQuery, debouncedQuery, handleSetQuery } = useSearchInput(
    filter.searchQuery ?? ''
  );

  const form = useForm<FilterFormData>({
    resolver: zodResolver(tournamentListFilterSchema),
    values: { ...filter, searchQuery: debouncedQuery },
    mode: 'all',
  });

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        form.setValue('searchQuery', searchQuery, { shouldValidate: true });
      }
    },
    [searchQuery, form]
  );

  const watchedValues = form.watch();
  useUrlSync(watchedValues);

  return (
    <Form {...form}>
      <form>
        <div className="flex flex-col gap-4">
          <SearchInput
            searchQuery={searchQuery}
            onQueryChange={handleSetQuery}
            onKeyDown={handleSearchKeyDown}
            control={form.control}
          />
          <RulesetFilter control={form.control} />
          <SortControls control={form.control} />
        </div>
      </form>
    </Form>
  );
}
