'use client';

import { leaderboardFilterSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { ControllerFieldState, useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Form, FormField, FormItem, FormLabel } from '../ui/form';
import { MultipleSelect, Option } from '../select/multiple-select';
import { Slider } from '../ui/slider';
import { Button } from '../ui/button';
import { Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';

const inputChangedStyle = (fieldState: ControllerFieldState) =>
  cn(
    fieldState.isDirty &&
      !fieldState.invalid &&
      'border-warning ring-warning focus-visible:border-warning focus-visible:ring-warning/20'
  );

const tierOptions: Option[] = [
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

// Exponential scaling function
const scaleExponentially = (value: number, min: number, max: number) => {
  return Math.round(min * Math.pow(max / min, value / 100));
};

// Inverse function for exponential scaling
const scaleInverseExponentially = (value: number, min: number, max: number) => {
  return (Math.log(value / min) / Math.log(max / min)) * 100;
};

export default function LeaderboardFilter() {
  const router = useRouter();
  const form = useForm<z.infer<typeof leaderboardFilterSchema>>({
    resolver: zodResolver(leaderboardFilterSchema),
    mode: 'all',
  });

const handleSubmit = form.handleSubmit((values) => {
  const queryParams = new URLSearchParams();
  
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Delete existing params first to avoid duplicates
        queryParams.delete(key);
        value.forEach((v) => queryParams.append(key, v));
      } else {
        queryParams.set(key, value.toString());
      }
    }
  });
  
  router.push(`/leaderboard?${queryParams.toString()}`);
});

  const handleClearFilters = () => {
    form.reset();
    router.push('/leaderboard');
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rank Range Slider */}
            <FormField
              control={form.control}
              name="minRank"
              render={({
                field: { value: minRank, onChange: onMinRankChange },
                fieldState,
              }) => (
                <FormField
                  control={form.control}
                  name="maxRank"
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
                          scaleInverseExponentially(minRank || 1, 1, 10000),
                          scaleInverseExponentially(maxRank || 10000, 1, 10000),
                        ]}
                        onValueChange={(vals) => {
                          onMinRankChange(
                            scaleExponentially(vals[0], 1, 10000)
                          );
                          onMaxRankChange(
                            scaleExponentially(vals[1], 1, 10000)
                          );
                        }}
                        minStepsBetweenThumbs={1}
                        className={inputChangedStyle(fieldState)}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={minRank || 1}
                          onChange={(e) =>
                            onMinRankChange(Number(e.target.value))
                          }
                          min={1}
                          max={maxRank || 10000}
                          className="w-20 p-1 text-center"
                        />
                        <Input
                          type="number"
                          value={maxRank || 10000}
                          onChange={(e) =>
                            onMaxRankChange(Number(e.target.value))
                          }
                          min={minRank || 1}
                          max={10000}
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
                fieldState,
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
                        className={inputChangedStyle(fieldState)}
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
                fieldState,
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
                        className={inputChangedStyle(fieldState)}
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
              name="minWinrate"
              render={({
                field: { value: minWinrate, onChange: onMinWinrateChange },
                fieldState,
              }) => (
                <FormField
                  control={form.control}
                  name="maxWinrate"
                  render={({
                    field: { value: maxWinrate, onChange: onMaxWinrateChange },
                  }) => (
                    <FormItem>
                      <FormLabel>Winrate</FormLabel>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[minWinrate || 0, maxWinrate || 1]}
                        onValueChange={(vals) => {
                          onMinWinrateChange(vals[0]);
                          onMaxWinrateChange(vals[1]);
                        }}
                        minStepsBetweenThumbs={1}
                        className={inputChangedStyle(fieldState)}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <Input
                          type="number"
                          value={minWinrate || 0}
                          onChange={(e) =>
                            onMinWinrateChange(Number(e.target.value))
                          }
                          min={0}
                          max={maxWinrate || 1}
                          step={0.01}
                          className="w-20 p-1 text-center"
                        />
                        <Input
                          type="number"
                          value={maxWinrate || 1}
                          onChange={(e) =>
                            onMaxWinrateChange(Number(e.target.value))
                          }
                          min={minWinrate || 0}
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
              render={({ field: { value, onChange }, fieldState }) => (
                <FormItem>
                  <FormLabel>Tiers</FormLabel>
                  <MultipleSelect
                    className={inputChangedStyle(fieldState)}
                    selected={value || []}
                    options={tierOptions}
                    onChange={(values) => onChange(values)}
                  />
                </FormItem>
              )}
            />

            {/* Form action buttons */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
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
