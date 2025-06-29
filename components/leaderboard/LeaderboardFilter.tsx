'use client';

import { leaderboardFilterSchema } from '@/lib/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Form, FormField, FormItem, FormLabel, FormControl } from '../ui/form';
import { MultipleSelect, Option } from '../select/multiple-select';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RulesetEnumHelper } from '@/lib/enums';
import {
  createSearchParamsFromSchema,
  defaultLeaderboardFilterValues,
  leaderboardTierFilterValues,
} from '@/lib/utils/leaderboard';
import { Ruleset } from '@osu-tournament-rating/otr-api-client';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { cn } from '@/lib/utils';

import { getAllCountries } from 'countries-and-timezones';
import { CountrySearchSelect } from './CountryFilter';

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
// Get all countries and create options
const countries = getAllCountries();
const countryOptions = Object.entries(countries)
  .map(([code, country]) => ({
    code,
    name: country.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
console.log(countries);
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
    defaultValues: defaultLeaderboardFilterValues,
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const router = useRouter();
  const params = useSearchParams();
  const pathName = usePathname();

  const onSubmit = (schema: z.infer<typeof leaderboardFilterSchema>) => {
    const searchParams = createSearchParamsFromSchema(schema);

    if (searchParams.toString() === params.toString()) {
      return;
    }

    searchParams.delete('page');
    router.push(pathName + (searchParams.size > 0 ? `?${searchParams}` : ''));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-popover"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-1 w-80 p-4" align="end">
        <Form {...form}>
          <form className="items-center space-y-4">
            {/* Ruleset select */}
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
                        field.onChange(Number(val));
                        form.handleSubmit(onSubmit)();
                      }}
                      type="single"
                    >
                      {Object.entries(RulesetEnumHelper.metadata)
                        .filter(
                          ([ruleset]) => Number(ruleset) !== Ruleset.ManiaOther
                        )
                        .map(([ruleset]) => (
                          <ToggleGroupItem
                            key={`sort-${ruleset}`}
                            className="px-0"
                            value={ruleset}
                            aria-label={Ruleset[Number(ruleset)]}
                            onClick={(e) => {
                              if (field.value === Number(ruleset)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <RulesetIcon
                              ruleset={Number(ruleset)}
                              className={cn(
                                'size-5',
                                field.value === Number(ruleset)
                                  ? 'fill-primary'
                                  : 'fill-foreground'
                              )}
                            />
                          </ToggleGroupItem>
                        ))}
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* osu! rank slider */}
            <FormField
              control={form.control}
              name="minOsuRank"
              render={({ field: minRankField }) => (
                <FormField
                  control={form.control}
                  name="maxOsuRank"
                  render={({ field: maxRankField }) => (
                    <FormItem>
                      <FormLabel>osu! Rank</FormLabel>
                      <Slider
                        // All exponentially scaling sliders have a range of 0 - 100
                        min={0}
                        max={100}
                        step={1}
                        value={[
                          scaleInverseExponentially(
                            minRankField.value ??
                              defaultLeaderboardFilterValues.minOsuRank!,
                            defaultLeaderboardFilterValues.minOsuRank!,
                            defaultLeaderboardFilterValues.maxOsuRank!
                          ),
                          scaleInverseExponentially(
                            maxRankField.value ??
                              defaultLeaderboardFilterValues.maxOsuRank!,
                            defaultLeaderboardFilterValues.minOsuRank!,
                            defaultLeaderboardFilterValues.maxOsuRank!
                          ),
                        ]}
                        onValueChange={(vals) => {
                          minRankField.onChange(
                            scaleExponentially(
                              vals[0],
                              defaultLeaderboardFilterValues.minOsuRank!,
                              defaultLeaderboardFilterValues.maxOsuRank!
                            )
                          );
                          maxRankField.onChange(
                            scaleExponentially(
                              vals[1],
                              defaultLeaderboardFilterValues.minOsuRank!,
                              defaultLeaderboardFilterValues.maxOsuRank!
                            )
                          );
                        }}
                        onPointerUp={form.handleSubmit(onSubmit)}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={
                            minRankField.value ??
                            defaultLeaderboardFilterValues.minOsuRank
                          }
                          min={defaultLeaderboardFilterValues.minOsuRank!}
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
                            maxRankField.value ??
                            defaultLeaderboardFilterValues.maxOsuRank
                          }
                          min={minRankField.value}
                          max={defaultLeaderboardFilterValues.maxOsuRank!}
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

            {/* Rating slider */}
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
                        min={defaultLeaderboardFilterValues.minRating!}
                        max={defaultLeaderboardFilterValues.maxRating!}
                        step={20}
                        value={[
                          minRatingField.value ??
                            defaultLeaderboardFilterValues.minRating!,
                          maxRatingField.value ??
                            defaultLeaderboardFilterValues.maxRating!,
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
                            defaultLeaderboardFilterValues.minRating
                          }
                          min={defaultLeaderboardFilterValues.minRating!}
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
                            defaultLeaderboardFilterValues.maxRating
                          }
                          min={minRatingField.value}
                          max={defaultLeaderboardFilterValues.maxRating!}
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

            {/* Match count slider */}
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
                        // All exponentially scaling sliders have a range of 0 - 100
                        min={0}
                        max={100}
                        step={1}
                        value={[
                          scaleInverseExponentially(
                            minMatchesField.value ??
                              defaultLeaderboardFilterValues.minMatches!,
                            defaultLeaderboardFilterValues.minMatches!,
                            defaultLeaderboardFilterValues.maxMatches!
                          ),
                          scaleInverseExponentially(
                            maxMatchesField.value ??
                              defaultLeaderboardFilterValues.maxMatches!,
                            defaultLeaderboardFilterValues.minMatches!,
                            defaultLeaderboardFilterValues.maxMatches!
                          ),
                        ]}
                        onValueChange={(vals) => {
                          minMatchesField.onChange(
                            scaleExponentially(
                              vals[0],
                              defaultLeaderboardFilterValues.minMatches!,
                              defaultLeaderboardFilterValues.maxMatches!
                            )
                          );
                          maxMatchesField.onChange(
                            scaleExponentially(
                              vals[1],
                              defaultLeaderboardFilterValues.minMatches!,
                              defaultLeaderboardFilterValues.maxMatches!
                            )
                          );
                        }}
                        onPointerUp={form.handleSubmit(onSubmit)}
                        minStepsBetweenThumbs={1}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={
                            minMatchesField.value ??
                            defaultLeaderboardFilterValues.minMatches
                          }
                          min={defaultLeaderboardFilterValues.minMatches}
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
                            defaultLeaderboardFilterValues.maxMatches
                          }
                          min={minMatchesField.value}
                          max={defaultLeaderboardFilterValues.maxMatches}
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

            {/* Win rate slider */}
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
                        min={defaultLeaderboardFilterValues.minWinRate}
                        max={defaultLeaderboardFilterValues.maxWinRate}
                        step={0.1}
                        value={[
                          minWinRateField.value ??
                            defaultLeaderboardFilterValues.minWinRate!,
                          maxWinRateField.value ??
                            defaultLeaderboardFilterValues.maxWinRate!,
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
                            defaultLeaderboardFilterValues.minWinRate
                          }
                          min={defaultLeaderboardFilterValues.minWinRate}
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
                            defaultLeaderboardFilterValues.maxWinRate
                          }
                          min={minWinRateField.value}
                          max={defaultLeaderboardFilterValues.maxWinRate}
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

            {/* Tier select */}
            <FormField
              control={form.control}
              name="tiers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiers</FormLabel>
                  <MultipleSelect
                    selected={field.value ?? []}
                    options={tierItems}
                    onChange={(value: string[]) => {
                      field.onChange(value);
                      form.handleSubmit(onSubmit)();
                    }}
                  />
                </FormItem>
              )}
            />
            {/* Country select */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <CountrySearchSelect
                      value={field.value ?? ''}
                      onValueChange={(value) => {
                        field.onChange(value || undefined);

                        form.handleSubmit(onSubmit)();
                      }}
                      countries={countryOptions}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Clear filters button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(defaultLeaderboardFilterValues);
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
