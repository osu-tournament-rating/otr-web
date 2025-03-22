'use client';

import { leaderboardFilterSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { usePathname, useRouter } from 'next/navigation';
import { Form, FormField, FormItem, FormLabel } from '../ui/form';
import { MultipleSelect, Option } from '../select/multiple-select';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { leaderboardTierFilterValues } from '@/lib/utils/leaderboard';
import { useEffect } from 'react';

const tierItems: Option<(typeof leaderboardTierFilterValues)[number]>[] = [
  { label: 'Bronze', value: 'bronze' },
  { label: 'Silver', value: 'silver' },
  { label: 'Gold', value: 'gold' },
  { label: 'Platinum', value: 'platinum' },
  { label: 'Emerald', value: 'emerald' },
  { label: 'Diamond', value: 'diamond' },
  { label: 'Master', value: 'master' },
  { label: 'Grandmaster', value: 'grandmaster' },
  { label: 'Elite Grandmaster', value: 'eliteGrandmaster' },
];

const defaultFilterValues: z.infer<typeof leaderboardFilterSchema> =
  leaderboardFilterSchema.parse({
    minOsuRank: 1,
    maxOsuRank: 100000,
    minRating: 100,
    maxRating: 3500,
    minMatches: 1,
    maxMatches: 1000,
    minWinRate: 0,
    maxWinRate: 1,
    tiers: [],
  });

// Exponential scaling function
const scaleExponentially = (value: number, min: number, max: number) => {
  return Math.round(min * Math.pow(max / min, value / 100));
};

// Inverse function for exponential scaling
const scaleInverseExponentially = (value: number, min: number, max: number) => {
  return (Math.log(value / min) / Math.log(max / min)) * 100;
};

export default function LeaderboardFilter({
  filter,
}: {
  filter: z.infer<typeof leaderboardFilterSchema>;
}) {
  const form = useForm<z.infer<typeof leaderboardFilterSchema>>({
    resolver: zodResolver(leaderboardFilterSchema),
    values: filter,
    defaultValues: defaultFilterValues,
    mode: 'onBlur',
  });

  const { watch, handleSubmit } = form;

  const pathName = usePathname();
  const router = useRouter();

  useEffect(() => {
    const { unsubscribe } = watch(() =>
      handleSubmit((values) => {
        // Build search params
        const searchParams = new URLSearchParams();

        Object.entries(values).forEach(([k, v]) => {
          if (v === undefined) {
            return;
          }

          if (Array.isArray(v)) {
            v.forEach((val) => searchParams.append(k, String(val)));
          } else {
            searchParams.set(k, String(v));
          }
        });

        const query = searchParams.size > 0 ? `?${searchParams}` : '';

        router.push(pathName + query);
      })()
    );

    return () => unsubscribe();
  }, [watch, handleSubmit, filter, router, pathName]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rank Range Slider */}
            <FormField
              control={form.control}
              name="minOsuRank"
              render={({
                field: { value: minRank, onChange: onMinRankChange },
              }) => (
                <FormField
                  control={form.control}
                  name="maxOsuRank"
                  render={({
                    field: { value: maxRank, onChange: onMaxRankChange },
                  }) => (
                    <FormItem>
                      <FormLabel>Rank</FormLabel>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[
                          scaleInverseExponentially(minRank || 1, 1, 100000),
                          scaleInverseExponentially(
                            maxRank || 100000,
                            1,
                            100000
                          ),
                        ]}
                        onValueChange={(vals) => {
                          onMinRankChange(
                            scaleExponentially(vals[0], 1, 100000)
                          );
                          onMaxRankChange(
                            scaleExponentially(vals[1], 1, 100000)
                          );
                        }}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={minRank || 1}
                          onChange={(e) =>
                            onMinRankChange(Number(e.target.value))
                          }
                          min={1}
                          max={maxRank || 100000}
                          className="w-20 p-1 text-center"
                        />
                        <Input
                          type="number"
                          value={maxRank || 100000}
                          onChange={(e) =>
                            onMaxRankChange(Number(e.target.value))
                          }
                          min={minRank || 1}
                          max={100000}
                          className="w-20 p-1 text-center"
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />

            {/* Rating Range Slider */}
            <FormField
              control={form.control}
              name="minRating"
              render={({
                field: { value: minRating, onChange: onMinRatingChange },
              }) => (
                <FormField
                  control={form.control}
                  name="maxRating"
                  render={({
                    field: { value: maxRating, onChange: onMaxRatingChange },
                  }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <Slider
                        min={100}
                        max={3500}
                        step={10}
                        value={[minRating || 100, maxRating || 3500]}
                        onValueChange={(vals) => {
                          onMinRatingChange(vals[0]);
                          onMaxRatingChange(vals[1]);
                        }}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={minRating || 100}
                          onChange={(e) =>
                            onMinRatingChange(Number(e.target.value))
                          }
                          min={100}
                          max={maxRating || 3500}
                          className="w-20 p-1 text-center"
                        />
                        <Input
                          type="number"
                          value={maxRating || 3500}
                          onChange={(e) =>
                            onMaxRatingChange(Number(e.target.value))
                          }
                          min={minRating || 100}
                          max={3500}
                          className="w-20 p-1 text-center"
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />

            {/* Matches Range Slider */}
            <FormField
              control={form.control}
              name="minMatches"
              render={({
                field: { value: minMatches, onChange: onMinMatchesChange },
              }) => (
                <FormField
                  control={form.control}
                  name="maxMatches"
                  render={({
                    field: { value: maxMatches, onChange: onMaxMatchesChange },
                  }) => (
                    <FormItem>
                      <FormLabel>Matches</FormLabel>
                      <Slider
                        min={1}
                        max={1000}
                        step={1}
                        value={[minMatches || 1, maxMatches || 1000]}
                        onValueChange={(vals) => {
                          onMinMatchesChange(vals[0]);
                          onMaxMatchesChange(vals[1]);
                        }}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={minMatches || 1}
                          onChange={(e) =>
                            onMinMatchesChange(Number(e.target.value))
                          }
                          min={1}
                          max={maxMatches || 1000}
                          className="w-20 p-1 text-center"
                        />
                        <Input
                          type="number"
                          value={maxMatches || 1000}
                          onChange={(e) =>
                            onMaxMatchesChange(Number(e.target.value))
                          }
                          min={minMatches || 1}
                          max={1000}
                          className="w-20 p-1 text-center"
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />

            {/* Winrate Range Slider */}
            <FormField
              control={form.control}
              name="minWinRate"
              render={({
                field: { value: minWinRate, onChange: onMinWinRateChange },
              }) => (
                <FormField
                  control={form.control}
                  name="maxWinRate"
                  render={({
                    field: { value: maxWinRate, onChange: onMaxWinRateChange },
                  }) => (
                    <FormItem>
                      <FormLabel>Win rate</FormLabel>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[minWinRate || 0, maxWinRate || 1]}
                        onValueChange={(vals) => {
                          onMinWinRateChange(vals[0]);
                          onMaxWinRateChange(vals[1]);
                        }}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={minWinRate || 0}
                          onChange={(e) =>
                            onMinWinRateChange(Number(e.target.value))
                          }
                          min={0}
                          max={maxWinRate || 1}
                          step={0.01}
                          className="w-20 p-1 text-center"
                        />
                        <Input
                          type="number"
                          value={maxWinRate || 1}
                          onChange={(e) =>
                            onMaxWinRateChange(Number(e.target.value))
                          }
                          min={minWinRate || 0}
                          max={1}
                          step={0.01}
                          className="w-20 p-1 text-center"
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />

            {/* Tiers */}
            <FormField
              control={form.control}
              name="tiers"
              render={({ field: { value, onChange } }) => (
                <FormItem>
                  <FormLabel>Tiers</FormLabel>
                  <MultipleSelect
                    selected={value || []}
                    options={tierItems}
                    onChange={onChange}
                  />
                </FormItem>
              )}
            />

            {/* Form action buttons */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
              <Button type="submit">Apply Filters</Button>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
