'use client';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
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
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePathname, useRouter } from 'next/navigation';
import { TournamentListFilter as TournamentListFilterType } from '@/lib/types';
import { cn } from '@/lib/utils';

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

        router.push(pathName + query);
      })()
    );

    return () => unsubscribe();
  }, [watch, handleSubmit, filter, router, pathName]);

  return (
    <Form {...form}>
      <form>
        <div className="flex flex-col">
          {/* Input based filters */}
          <div className="flex flex-col p-4">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Search className="absolute inset-y-1/6 right-2" />
            </div>
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
      </form>
    </Form>
  );
}
