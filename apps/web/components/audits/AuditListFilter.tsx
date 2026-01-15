'use client';

import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { auditListFilterSchema, defaultAuditListFilter } from '@/lib/schema';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUp, ArrowDown, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { ReportEntityType } from '@otr/core/osu';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ENTITY_TYPE_OPTIONS = [
  { value: undefined, label: 'All Types' },
  { value: ReportEntityType.Tournament, label: 'Tournaments' },
  { value: ReportEntityType.Match, label: 'Matches' },
  { value: ReportEntityType.Game, label: 'Games' },
  { value: ReportEntityType.Score, label: 'Scores' },
] as const;

const SORT_OPTIONS = [
  { value: 'created', label: 'Date' },
  { value: 'id', label: 'ID' },
] as const;

type FilterFormData = z.infer<typeof auditListFilterSchema>;

interface AuditListFilterProps {
  filter: FilterFormData;
}

const useUrlSync = (
  watchedValues: FilterFormData,
  currentFilter: FilterFormData
) => {
  const pathName = usePathname();
  const router = useRouter();
  const lastPushedUrl = useRef<string>('');
  const filterPropRef = useRef(currentFilter);
  const isUpdatingFromPropRef = useRef(false);

  useEffect(() => {
    const filterChanged =
      JSON.stringify(filterPropRef.current) !== JSON.stringify(currentFilter);

    if (filterChanged) {
      filterPropRef.current = currentFilter;
      isUpdatingFromPropRef.current = true;

      const timer = setTimeout(() => {
        isUpdatingFromPropRef.current = false;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [currentFilter]);

  useEffect(() => {
    if (isUpdatingFromPropRef.current) {
      return;
    }

    const searchParams = new URLSearchParams();

    Object.entries(watchedValues).forEach(([key, value]) => {
      const filterKey = key as keyof FilterFormData;

      if (
        value === undefined ||
        defaultAuditListFilter[
          filterKey as keyof typeof defaultAuditListFilter
        ] === value ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        return;
      }

      searchParams.set(filterKey, String(value));
    });

    const queryString = searchParams.toString();
    const newPath = queryString ? `${pathName}?${queryString}` : pathName;
    const currentUrl = window.location.pathname + window.location.search;

    if (currentUrl !== newPath && lastPushedUrl.current !== newPath) {
      lastPushedUrl.current = newPath;
      router.push(newPath, { scroll: false });
    }
  }, [watchedValues, router, pathName]);
};

export default function AuditListFilter({ filter }: AuditListFilterProps) {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(auditListFilterSchema),
    values: filter,
    mode: 'all',
  });

  const watchedValues = form.watch();
  useUrlSync(watchedValues, filter);

  return (
    <Form {...form}>
      <form>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <FormField
              control={form.control}
              name="entityType"
              render={({ field }) => (
                <FormItem>
                  <Select
                    value={
                      field.value !== undefined ? String(field.value) : 'all'
                    }
                    onValueChange={(val) =>
                      field.onChange(val === 'all' ? undefined : Number(val))
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Entity Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENTITY_TYPE_OPTIONS.map(({ value, label }) => (
                        <SelectItem
                          key={label}
                          value={value !== undefined ? String(value) : 'all'}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userActionsOnly"
              render={({ field }) => (
                <FormItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant={field.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => field.onChange(!field.value)}
                          className="gap-1.5"
                        >
                          <UserCheck className="h-4 w-4" />
                          User Actions
                        </Button>
                      </FormControl>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {field.value
                          ? 'Showing user-triggered changes only'
                          : 'Show only user-triggered changes'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="sort"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SORT_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descending"
              render={({ field }) => (
                <FormItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => field.onChange(!field.value)}
                          aria-label={
                            field.value ? 'Sort Ascending' : 'Sort Descending'
                          }
                        >
                          {field.value ? (
                            <ArrowDown className="h-4 w-4" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                        </Button>
                      </FormControl>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {field.value ? 'Sort Ascending' : 'Sort Descending'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
}
