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
import { setFlattenedParams } from '@/lib/utils/urlParams';
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

const defaultFilterValues: z.infer<typeof leaderboardFilterSchema> = {
  minOsuRank: 1,
  maxOsuRank: 100000,
  minRating: 100,
  maxRating: 3500,
  minMatches: 1,
  maxMatches: 1000,
  minWinRate: 0,
  maxWinRate: 100,
  tiers: [],
};

const scaleExponentially = (value: number, min: number, max: number) => {
  return Math.round(min * Math.pow(max / min, value / 100));
};

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
  });

  const pathName = usePathname();
  const router = useRouter();

  const onSubmit = (values: z.infer<typeof leaderboardFilterSchema>) => {
    const searchParams = new URLSearchParams();

    Object.entries(values).forEach(([k, v]) => {
      if (v === undefined) return;

      setFlattenedParams(searchParams, k, v);
    });

    router.push(pathName + (searchParams.size > 0 ? `?${searchParams}` : ''));
  };

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
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="minOsuRank"
              render={({ field: minRankField }) => (
                <FormField
                  control={form.control}
                  name="maxOsuRank"
                  render={({ field: maxRankField }) => (
                    <FormItem>
                      <FormLabel>Rank</FormLabel>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[
                          scaleInverseExponentially(
                            minRankField.value ??
                              defaultFilterValues.minOsuRank!,
                            1,
                            100000
                          ),
                          scaleInverseExponentially(
                            maxRankField.value ??
                              defaultFilterValues.maxOsuRank!,
                            1,
                            100000
                          ),
                        ]}
                        onValueChange={(vals) => {
                          minRankField.onChange(
                            scaleExponentially(vals[0], 1, 100000)
                          );
                          maxRankField.onChange(
                            scaleExponentially(vals[1], 1, 100000)
                          );
                        }}
                        onPointerUp={form.handleSubmit(onSubmit)}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={
                            minRankField.value ?? defaultFilterValues.minOsuRank
                          }
                          min={1}
                          max={maxRankField.value}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            minRankField.onChange(Number(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                        <Input
                          type="number"
                          value={
                            maxRankField.value ?? defaultFilterValues.maxOsuRank
                          }
                          min={minRankField.value}
                          max={100000}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            maxRankField.onChange(Number(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />

            <FormField
              control={form.control}
              name="minRating"
              render={({ field: minRatingField }) => (
                <FormField
                  control={form.control}
                  name="maxRating"
                  render={({ field: maxRatingField }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <Slider
                        min={100}
                        max={3500}
                        step={10}
                        value={[
                          minRatingField.value ??
                            defaultFilterValues.minRating!,
                          maxRatingField.value ??
                            defaultFilterValues.maxRating!,
                        ]}
                        onValueChange={(vals) => {
                          minRatingField.onChange(vals[0]);
                          maxRatingField.onChange(vals[1]);
                        }}
                        onPointerUp={form.handleSubmit(onSubmit)}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={
                            minRatingField.value ??
                            defaultFilterValues.minRating
                          }
                          min={100}
                          max={maxRatingField.value}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            minRatingField.onChange(Number(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                        <Input
                          type="number"
                          value={
                            maxRatingField.value ??
                            defaultFilterValues.maxRating
                          }
                          min={minRatingField.value}
                          max={3500}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            maxRatingField.onChange(Number(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />
            <FormField
              control={form.control}
              name="minMatches"
              render={({ field: minMatchesField }) => (
                <FormField
                  control={form.control}
                  name="maxMatches"
                  render={({ field: maxMatchesField }) => (
                    <FormItem>
                      <FormLabel>Matches</FormLabel>
                      <Slider
                        min={1}
                        max={1000}
                        step={1}
                        value={[
                          minMatchesField.value ??
                            defaultFilterValues.minMatches!,
                          maxMatchesField.value ??
                            defaultFilterValues.maxMatches!,
                        ]}
                        onValueChange={(vals) => {
                          minMatchesField.onChange(vals[0]);
                          maxMatchesField.onChange(vals[1]);
                        }}
                        onPointerUp={form.handleSubmit(onSubmit)}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={
                            minMatchesField.value ??
                            defaultFilterValues.minMatches
                          }
                          min={1}
                          max={maxMatchesField.value}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            minMatchesField.onChange(Number(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                        <Input
                          type="number"
                          value={
                            maxMatchesField.value ??
                            defaultFilterValues.maxMatches
                          }
                          min={minMatchesField.value}
                          max={1000}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            maxMatchesField.onChange(Number(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />
            <FormField
              control={form.control}
              name="minWinRate"
              render={({ field: minWinRateField }) => (
                <FormField
                  control={form.control}
                  name="maxWinRate"
                  render={({ field: maxWinRateField }) => (
                    <FormItem>
                      <FormLabel>Win rate %</FormLabel>
                      <Slider
                        min={defaultFilterValues.minWinRate}
                        max={defaultFilterValues.maxWinRate}
                        step={0.1}
                        value={[
                          minWinRateField.value ??
                            defaultFilterValues.minWinRate!,
                          maxWinRateField.value ??
                            defaultFilterValues.maxWinRate!,
                        ]}
                        onValueChange={(vals) => {
                          minWinRateField.onChange(vals[0]);
                          maxWinRateField.onChange(vals[1]);
                        }}
                        onPointerUp={form.handleSubmit(onSubmit)}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={
                            minWinRateField.value ??
                            defaultFilterValues.minWinRate
                          }
                          min={defaultFilterValues.minWinRate}
                          max={maxWinRateField.value}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            minWinRateField.onChange(parseFloat(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                        <Input
                          type="number"
                          value={
                            maxWinRateField.value ??
                            defaultFilterValues.maxWinRate
                          }
                          min={minWinRateField.value}
                          max={defaultFilterValues.maxWinRate}
                          className="w-20 p-1 text-center"
                          onChange={(e) =>
                            maxWinRateField.onChange(parseFloat(e.target.value))
                          }
                          onBlur={form.handleSubmit(onSubmit)}
                        />
                      </div>
                    </FormItem>
                  )}
                />
              )}
            />

            <FormField
              control={form.control}
              name="tiers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiers</FormLabel>
                  <MultipleSelect
                    selected={field.value ?? []}
                    options={tierItems}
                    onChange={(value) => {
                      field.onChange(value);
                      form.handleSubmit(onSubmit)();
                    }}
                  />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(defaultFilterValues);
                  router.push('/leaderboard');
                }}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
