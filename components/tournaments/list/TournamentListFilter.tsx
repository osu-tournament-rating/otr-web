'use client';

import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  defaultTournamentListFilter,
  tournamentListFilterSchema,
} from '@/lib/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import {
  Ruleset,
  TournamentQuerySortType,
} from '@osu-tournament-rating/otr-api-client';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePathname, useRouter } from 'next/navigation';
import { TournamentListFilter as TournamentListFilterType } from '@/lib/types';
import { cn } from '@/lib/utils';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { RulesetEnumHelper } from '@/lib/enums';
import { useIntersectionObserver } from '@uidotdev/usehooks';

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
  const form = useForm<z.infer<typeof tournamentListFilterSchema>>({
    resolver: zodResolver(tournamentListFilterSchema),
    values: filter,
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

  const [ref, entry] = useIntersectionObserver();

  return (
    <Form {...form}>
      <form>
        {/* Hero */}
        <div ref={ref} className="flex flex-col">
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
                        placeholder="type to search"
                        type="search"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Search className="absolute inset-y-1/6 right-2" />
            </div>
            {/* Ruleset */}
            <FormField
              control={form.control}
              name="ruleset"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ToggleGroup
                      className="w-full gap-2"
                      {...field}
                      value={String(field.value)}
                      onValueChange={(val) => {
                        field.onChange(val === '' ? undefined : Number(val));
                        console.log(val);
                      }}
                      type="single"
                    >
                      {Object.entries(RulesetEnumHelper.metadata)
                        .filter(
                          ([ruleset]) => Number(ruleset) !== Ruleset.ManiaOther
                        )
                        .map(([ruleset, { text }]) => (
                          <ToggleGroupItem
                            key={`sort-ruleset-${ruleset}`}
                            className="flex w-fit flex-auto text-foreground first:rounded-l-none last:rounded-r-none data-[state=on]:text-primary"
                            value={ruleset}
                            aria-checked={field.value === Number(ruleset)}
                          >
                            <RulesetIcon
                              ruleset={Number(ruleset)}
                              className="size-5"
                              fill="currentColor"
                            />
                            <span>{text}</span>
                          </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Sort type and direction */}
          <FormField
            control={form.control}
            name="sort"
            render={({ field }) => {
              const descending = form.watch('descending');
              return (
                <FormItem className="flex flex-row items-baseline bg-[color-mix(in_hsl,var(--primary)_20%,var(--background))] px-2 py-1">
                  <span className="text-xs text-secondary-foreground">
                    Sort by
                  </span>
                  <FormControl>
                    <ToggleGroup
                      {...field}
                      value={String(field.value)}
                      onValueChange={(val) => field.onChange(Number(val))}
                      className="flex gap-2"
                      type="single"
                    >
                      {sortToggleItems.map(({ value, text }) => (
                        <ToggleGroupItem
                          key={`sort-${value}`}
                          className="flex flex-auto cursor-pointer rounded-xl"
                          value={value.toString()}
                          aria-label={TournamentQuerySortType[value]}
                          onClick={(e) => {
                            if (field.value === value) {
                              e.preventDefault();
                              form.setValue('descending', !descending);
                            }
                          }}
                        >
                          {text}
                          {descending ? (
                            <ChevronDown
                              className={cn(
                                'opacity-0',
                                field.value === value && 'opacity-100'
                              )}
                            />
                          ) : (
                            <ChevronUp
                              className={cn(
                                'opacity-0',
                                field.value === value && 'opacity-100'
                              )}
                            />
                          )}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              );
            }}
          />
        </div>

        {/* Sticky, appears when hero section is not visible */}
        <div
          className={cn(
            'fixed top-0 right-0 left-0 z-40 mx-auto hidden w-full px-5 transition-all duration-300 md:max-w-4xl xl:max-w-6xl',
            // Hidden until intersection observer is available
            entry && 'flex',
            // Animate slide-in from behind navbar
            entry?.isIntersecting
              ? 'top-0 -translate-y-0 opacity-0'
              : 'top-[65px] translate-y-0 opacity-100'
          )}
        >
          <div className="h-12 w-full border border-t-0 bg-purple-400"></div>
        </div>
      </form>
    </Form>
  );
}
