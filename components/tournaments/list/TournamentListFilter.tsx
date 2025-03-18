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
import { tournamentListFilterSchema } from '@/lib/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTournamentListFilter } from './TournamentListFilterContext';
import { useEffect } from 'react';

export default function TournamentListFilter() {
  const { filter, setFilter } = useTournamentListFilter();
  const form = useForm<z.infer<typeof tournamentListFilterSchema>>({
    resolver: zodResolver(tournamentListFilterSchema),
    values: filter,
    mode: 'all',
  });

  const { watch, handleSubmit } = form;

  // Automatically "submit" the form on any change event by setting the filter
  useEffect(() => {
    const { unsubscribe } = watch(() =>
      handleSubmit((values) => {
        setFilter(values);
      })()
    );

    return () => unsubscribe();
  }, [watch, handleSubmit, setFilter]);

  return (
    <Form {...form}>
      <form>
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
      </form>
    </Form>
  );
}
