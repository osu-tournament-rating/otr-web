'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl } from '../ui/form';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { playerRatingChartFilterSchema } from '@/lib/schema';

export type PlayerRatingChartFilterValues = z.infer<
  typeof playerRatingChartFilterSchema
>;

interface PlayerRatingChartOptionsProps {
  filter: PlayerRatingChartFilterValues;
  onFilterChange: (values: PlayerRatingChartFilterValues) => void;
}

export default function PlayerRatingChartOptions({
  filter,
  onFilterChange,
}: PlayerRatingChartOptionsProps) {
  const form = useForm<PlayerRatingChartFilterValues>({
    resolver: zodResolver(playerRatingChartFilterSchema),
    values: filter,
    defaultValues: {
      showDecay: true,
    },
  });

  const handleSubmit = (values: PlayerRatingChartFilterValues) => {
    onFilterChange(values);
  };

  const handleReset = () => {
    const defaultValues = {
      showDecay: true,
    };
    form.reset(defaultValues);
    onFilterChange(defaultValues);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2">
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">Options</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-1 w-64 p-4 font-sans" align="end">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <h4 className="font-medium">Chart Display Options</h4>

            <FormField
              control={form.control}
              name="showDecay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0 space-x-3 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    Display Decay
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Reset
              </Button>
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
