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
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import {
  Ruleset,
  TournamentQuerySortType,
} from '@osu-tournament-rating/otr-api-client';
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
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const sortToggleItems: { value: TournamentQuerySortType; text: string }[] = [
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
];

export default function TournamentListFilter({
  filter,
}: {
  filter: z.infer<typeof tournamentListFilterSchema>;
}) {
  const [searchQuery, setSearchQuery] = useState(filter.searchQuery);
  const debouncedQuery = useDebounce(searchQuery, 500);

  const handleSetQuery = (input: string) => {
    setSearchQuery(input.trimStart());
  };

  const form = useForm<z.infer<typeof tournamentListFilterSchema>>({
    resolver: zodResolver(tournamentListFilterSchema),
    values: { ...filter, searchQuery: debouncedQuery },
    mode: 'all',
  });

  const { watch, handleSubmit } = form;

  const pathName = usePathname();
  const router = useRouter();

  // Automatically "submit" the form on any change event by setting the filter
  useEffect(() => {
    const { unsubscribe } = watch(() =>
      handleSubmit((values) => {
        // Build search params
        const searchParams = new URLSearchParams();
        Object.entries(values).forEach(([k, v]) => {
          if (
            defaultTournamentListFilter[k as keyof TournamentListFilterType] ===
              v ||
            (typeof v === 'string' && v === '')
          ) {
            return;
          }

          if (v instanceof Date) {
            searchParams.set(k, v.toISOString().split('T')[0]);
            return;
          }

          searchParams.set(k, String(v));
        });

        // Push new route
        const query =
          searchParams.size > 0 ? '?' + searchParams.toString() : '';

        router.push(pathName + query, { scroll: false });
      })()
    );

    return () => unsubscribe();
  }, [watch, handleSubmit, filter, router, pathName]);

  return (
    <Form {...form}>
      <form>
        {/* Hero */}
        <div className="flex flex-col">
          {/* Input based filters */}
          <div className="flex flex-col gap-2 p-4">
            {/* Search bar */}
            <div className="relative w-full">
              <FormField
                control={form.control}
                name="searchQuery"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input
                        {...field}
                        value={searchQuery}
                        onChange={(e) => handleSetQuery(e.target.value)}
                        placeholder="Type to search for tournaments..."
                        type="search"
                        className="h-12 rounded-lg border-2 border-border bg-card pl-10 text-base focus:border-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
            </div>
            {/* Ruleset */}
            <FormField
              control={form.control}
              name="ruleset"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex w-full flex-wrap gap-2">
                      {Object.entries(RulesetEnumHelper.metadata)
                        .filter(
                          ([ruleset]) => Number(ruleset) !== Ruleset.ManiaOther
                        )
                        .map(([ruleset, { text }]) => (
                          <Button
                            key={`ruleset-${ruleset}`}
                            variant={
                              field.value === Number(ruleset)
                                ? 'default'
                                : 'outline'
                            }
                            onClick={() =>
                              field.onChange(
                                field.value === Number(ruleset)
                                  ? undefined
                                  : Number(ruleset)
                              )
                            }
                            className="flex-auto"
                          >
                            <RulesetIcon
                              ruleset={Number(ruleset)}
                              className="mr-2 size-5"
                              fill="currentColor"
                            />
                            {text}
                          </Button>
                        ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Sort type and direction */}
          <div className="flex items-center gap-2 px-4 pb-4">
            <FormField
              control={form.control}
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
              control={form.control}
              name="descending"
              render={({ field }) => (
                <FormItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <FormControl>
                          <Button
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
                        <p>
                          {field.value ? 'Sort Ascending' : 'Sort Descending'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}
