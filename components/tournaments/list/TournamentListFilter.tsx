'use client';

import { Button } from '@/components/ui/button';
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
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { TournamentQuerySortType } from '@osu-tournament-rating/otr-api-client';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { usePathname, useRouter } from 'next/navigation';
import { TournamentListFilter as TournamentListFilterType } from '@/lib/types';

const sortToggleItems: { value: TournamentQuerySortType; text: string }[] = [
  {
    value: TournamentQuerySortType.Created,
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
        <div className="flex flex-col gap-2">
          {/* Search bar */}
          <div className="flex flex-row gap-2">
            <FormField
              control={form.control}
              name="searchQuery"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Filters */}
            <Button asChild variant={'outline'} size={'icon'} className="p-2">
              <Filter />
            </Button>
          </div>
          {/* Sort type and direction */}
          <FormField
            control={form.control}
            name="sort"
            render={({ field }) => {
              const descending = form.watch('descending');
              return (
                <FormItem>
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
                          className="flex flex-auto"
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
                          {field.value === value &&
                            (descending ? <ChevronDown /> : <ChevronUp />)}
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
