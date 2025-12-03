'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, usePathname } from 'next/navigation';
import { Filter, X, Search, Loader2 } from 'lucide-react';
import { Ruleset } from '@otr/core/osu';

import {
  beatmapListFilterSchema,
  defaultBeatmapListFilter,
} from '@/lib/schema';
import { RulesetEnumHelper } from '@/lib/enums';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import RulesetIcon from '@/components/icons/RulesetIcon';
import { cn } from '@/lib/utils';

type FilterFormData = z.infer<typeof beatmapListFilterSchema>;

interface BeatmapListFilterProps {
  filter: FilterFormData;
}

const defaultFilterRanges = {
  sr: { min: 0, max: 12.5, step: 0.1 },
  bpm: { min: 60, max: 400, step: 5 },
  cs: { min: 0, max: 10, step: 0.5 },
  ar: { min: 0, max: 10, step: 0.5 },
  od: { min: 0, max: 10, step: 0.5 },
  hp: { min: 0, max: 10, step: 0.5 },
  length: { min: 0, max: 600, step: 15 },
  gameCount: { min: 0, max: 500, step: 1 },
  tournamentCount: { min: 1, max: 100, step: 1 },
};

export default function BeatmapListFilter({ filter }: BeatmapListFilterProps) {
  const [searchQuery, setSearchQuery] = useState(filter.q ?? '');
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const normalizedFilter = useMemo(
    () => ({
      ...defaultBeatmapListFilter,
      ...filter,
    }),
    [filter]
  );

  const form = useForm<FilterFormData>({
    resolver: zodResolver(beatmapListFilterSchema),
    defaultValues: normalizedFilter,
  });

  useEffect(() => {
    form.reset(normalizedFilter);
    setSearchQuery(filter.q ?? '');
    setIsSearching(false);
  }, [form, normalizedFilter, filter.q]);

  useEffect(() => {
    const currentQ = filter.q ?? '';
    if (searchQuery === currentQ) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      const params = buildSearchParams({
        ...form.getValues(),
        q: searchQuery,
      });
      router.push(pathname + (params.size > 0 ? `?${params}` : ''));
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchQuery, filter.q, form, pathname, router]);

  const buildSearchParams = (values: FilterFormData) => {
    const params = new URLSearchParams();
    const r = defaultFilterRanges;

    if (values.q) params.set('q', values.q);
    if (values.ruleset !== undefined)
      params.set('ruleset', String(values.ruleset));
    if (values.minSr !== undefined && values.minSr !== r.sr.min)
      params.set('minSr', String(values.minSr));
    if (values.maxSr !== undefined && values.maxSr !== r.sr.max)
      params.set('maxSr', String(values.maxSr));
    if (values.minBpm !== undefined && values.minBpm !== r.bpm.min)
      params.set('minBpm', String(values.minBpm));
    if (values.maxBpm !== undefined && values.maxBpm !== r.bpm.max)
      params.set('maxBpm', String(values.maxBpm));
    if (values.minCs !== undefined && values.minCs !== r.cs.min)
      params.set('minCs', String(values.minCs));
    if (values.maxCs !== undefined && values.maxCs !== r.cs.max)
      params.set('maxCs', String(values.maxCs));
    if (values.minAr !== undefined && values.minAr !== r.ar.min)
      params.set('minAr', String(values.minAr));
    if (values.maxAr !== undefined && values.maxAr !== r.ar.max)
      params.set('maxAr', String(values.maxAr));
    if (values.minOd !== undefined && values.minOd !== r.od.min)
      params.set('minOd', String(values.minOd));
    if (values.maxOd !== undefined && values.maxOd !== r.od.max)
      params.set('maxOd', String(values.maxOd));
    if (values.minHp !== undefined && values.minHp !== r.hp.min)
      params.set('minHp', String(values.minHp));
    if (values.maxHp !== undefined && values.maxHp !== r.hp.max)
      params.set('maxHp', String(values.maxHp));
    if (values.minLength !== undefined && values.minLength !== r.length.min)
      params.set('minLength', String(values.minLength));
    if (values.maxLength !== undefined && values.maxLength !== r.length.max)
      params.set('maxLength', String(values.maxLength));
    if (
      values.minGameCount !== undefined &&
      values.minGameCount !== r.gameCount.min
    )
      params.set('minGameCount', String(values.minGameCount));
    if (
      values.maxGameCount !== undefined &&
      values.maxGameCount !== r.gameCount.max
    )
      params.set('maxGameCount', String(values.maxGameCount));
    if (
      values.minTournamentCount !== undefined &&
      values.minTournamentCount !== r.tournamentCount.min
    )
      params.set('minTournamentCount', String(values.minTournamentCount));
    if (
      values.maxTournamentCount !== undefined &&
      values.maxTournamentCount !== r.tournamentCount.max
    )
      params.set('maxTournamentCount', String(values.maxTournamentCount));
    if (values.sort !== 'gameCount') params.set('sort', values.sort);
    if (!values.descending) params.set('descending', 'false');

    return params;
  };

  const onSubmit = (values: FilterFormData) => {
    const params = buildSearchParams({
      ...values,
      q: searchQuery,
    });
    router.push(pathname + (params.size > 0 ? `?${params}` : ''));
    setIsOpen(false);
  };

  const handleClear = () => {
    form.reset({ ...defaultBeatmapListFilter, q: '', ruleset: undefined });
    setSearchQuery('');
    router.push('/beatmaps');
  };

  const r = defaultFilterRanges;
  const activeFilterCount = [
    filter.ruleset !== undefined,
    (filter.minSr !== undefined && filter.minSr !== r.sr.min) ||
      (filter.maxSr !== undefined && filter.maxSr !== r.sr.max),
    (filter.minBpm !== undefined && filter.minBpm !== r.bpm.min) ||
      (filter.maxBpm !== undefined && filter.maxBpm !== r.bpm.max),
    (filter.minCs !== undefined && filter.minCs !== r.cs.min) ||
      (filter.maxCs !== undefined && filter.maxCs !== r.cs.max),
    (filter.minAr !== undefined && filter.minAr !== r.ar.min) ||
      (filter.maxAr !== undefined && filter.maxAr !== r.ar.max),
    (filter.minOd !== undefined && filter.minOd !== r.od.min) ||
      (filter.maxOd !== undefined && filter.maxOd !== r.od.max),
    (filter.minHp !== undefined && filter.minHp !== r.hp.min) ||
      (filter.maxHp !== undefined && filter.maxHp !== r.hp.max),
    (filter.minLength !== undefined && filter.minLength !== r.length.min) ||
      (filter.maxLength !== undefined && filter.maxLength !== r.length.max),
    (filter.minGameCount !== undefined &&
      filter.minGameCount !== r.gameCount.min) ||
      (filter.maxGameCount !== undefined &&
        filter.maxGameCount !== r.gameCount.max),
    (filter.minTournamentCount !== undefined &&
      filter.minTournamentCount !== r.tournamentCount.min) ||
      (filter.maxTournamentCount !== undefined &&
        filter.maxTournamentCount !== r.tournamentCount.max),
  ].filter(Boolean).length;

  const RangeSliderField = ({
    label,
    minField,
    maxField,
    range,
  }: {
    label: string;
    minField: keyof FilterFormData;
    maxField: keyof FilterFormData;
    range: { min: number; max: number; step: number };
  }) => (
    <FormField
      control={form.control}
      name={minField}
      render={({ field: minFieldControl }) => (
        <FormField
          control={form.control}
          name={maxField}
          render={({ field: maxFieldControl }) => (
            <FormItem>
              <FormLabel className="text-xs">{label}</FormLabel>
              <Slider
                min={range.min}
                max={range.max}
                step={range.step}
                value={[
                  (minFieldControl.value as number) ?? range.min,
                  (maxFieldControl.value as number) ?? range.max,
                ]}
                onValueChange={(vals) => {
                  const [newMin, newMax] = vals;
                  minFieldControl.onChange(newMin);
                  maxFieldControl.onChange(newMax);
                }}
                minStepsBetweenThumbs={1}
              />
              <div className="flex justify-between gap-2">
                <Input
                  type="number"
                  value={(minFieldControl.value as number) ?? range.min}
                  min={range.min}
                  max={(maxFieldControl.value as number) ?? range.max}
                  step={range.step}
                  className="w-16 p-1 text-center text-xs"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    minFieldControl.onChange(val);
                  }}
                />
                <Input
                  type="number"
                  value={(maxFieldControl.value as number) ?? range.max}
                  min={(minFieldControl.value as number) ?? range.min}
                  max={range.max}
                  step={range.step}
                  className="w-16 p-1 text-center text-xs"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    maxFieldControl.onChange(val);
                  }}
                />
              </div>
            </FormItem>
          )}
        />
      )}
    />
  );

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search beatmaps..."
          className="border-border bg-card focus:border-primary h-9 w-48 rounded-lg border pl-8 text-sm md:w-64"
        />
        {isSearching ? (
          <Loader2 className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
        ) : (
          <Search className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="bg-popover flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="end">
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="ruleset"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ToggleGroup
                        className="w-full gap-2"
                        {...field}
                        value={
                          field.value !== undefined ? String(field.value) : ''
                        }
                        onValueChange={(val) => {
                          field.onChange(val ? Number(val) : undefined);
                        }}
                        type="single"
                      >
                        {Object.entries(RulesetEnumHelper.metadata)
                          .filter(
                            ([ruleset]) =>
                              Number(ruleset) !== Ruleset.ManiaOther
                          )
                          .map(([ruleset]) => (
                            <ToggleGroupItem
                              key={`ruleset-${ruleset}`}
                              className="px-0"
                              value={ruleset}
                              aria-label={Ruleset[Number(ruleset)]}
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

              <RangeSliderField
                label="Star Rating"
                minField="minSr"
                maxField="maxSr"
                range={defaultFilterRanges.sr}
              />

              <RangeSliderField
                label="BPM"
                minField="minBpm"
                maxField="maxBpm"
                range={defaultFilterRanges.bpm}
              />

              <RangeSliderField
                label="Circle Size (CS)"
                minField="minCs"
                maxField="maxCs"
                range={defaultFilterRanges.cs}
              />

              <RangeSliderField
                label="Approach Rate (AR)"
                minField="minAr"
                maxField="maxAr"
                range={defaultFilterRanges.ar}
              />

              <RangeSliderField
                label="Overall Difficulty (OD)"
                minField="minOd"
                maxField="maxOd"
                range={defaultFilterRanges.od}
              />

              <RangeSliderField
                label="HP Drain (HP)"
                minField="minHp"
                maxField="maxHp"
                range={defaultFilterRanges.hp}
              />

              <RangeSliderField
                label="Length (seconds)"
                minField="minLength"
                maxField="maxLength"
                range={defaultFilterRanges.length}
              />

              <RangeSliderField
                label="Games Played"
                minField="minGameCount"
                maxField="maxGameCount"
                range={defaultFilterRanges.gameCount}
              />

              <RangeSliderField
                label="Tournaments Pooled"
                minField="minTournamentCount"
                maxField="maxTournamentCount"
                range={defaultFilterRanges.tournamentCount}
              />

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Apply
                </Button>
              </div>
            </form>
          </Form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
