'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { Loader2 } from 'lucide-react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import type {
  AuditTimelineItem,
  AuditGroupedEntry as AuditGroupedEntryType,
} from '@/lib/orpc/schema/audit';
import { Button } from '@/components/ui/button';
import { orpc } from '@/lib/orpc/orpc';
import AuditFilterPanel from './AuditFilterPanel';
import AuditEntryItem from './AuditEntryItem';
import AuditGroupedEntry from './AuditGroupedEntry';

type TimelineResponse = {
  items: AuditTimelineItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

type ActivityResponse = {
  groups: AuditGroupedEntryType[];
  nextCursor: string | null;
  hasMore: boolean;
};

interface SearchViewProps {
  searchParams: URLSearchParams;
}

function SearchView({ searchParams }: SearchViewProps) {
  const getKey = useCallback(
    (pageIndex: number, prev: TimelineResponse | null) => {
      if (prev && !prev.hasMore) return null;
      return [
        'audit-search',
        searchParams.toString(),
        prev?.nextCursor ?? null,
      ] as const;
    },
    [searchParams]
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, , cursor]) => {
      return orpc.audit.search({
        entityTypes: searchParams.get('entityTypes')
          ? (searchParams
              .get('entityTypes')!
              .split(',')
              .map(Number) as AuditEntityType[])
          : undefined,
        actionTypes: searchParams.get('actionTypes')
          ? (searchParams
              .get('actionTypes')!
              .split(',')
              .map(Number) as AuditActionType[])
          : undefined,
        adminOnly: searchParams.get('adminOnly') === 'true' || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        fieldChanged: searchParams.get('fieldChanged') || undefined,
        entityId: searchParams.get('entityId')
          ? Number(searchParams.get('entityId'))
          : undefined,
        limit: 50,
        cursor: cursor ?? undefined,
      });
    },
    { revalidateFirstPage: false, revalidateOnFocus: false }
  );

  const pages = data ?? [];
  const allItems = pages.flatMap((p) => p.items);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allItems.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        No audit entries match your filters.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {allItems.map((item) => {
        if (item.type === 'audit') {
          return (
            <AuditEntryItem
              key={`a-${item.data.id}`}
              entry={item.data}
              showEntityInfo
            />
          );
        }
        return null;
      })}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function DefaultView() {
  const getKey = useCallback(
    (pageIndex: number, prev: ActivityResponse | null) => {
      if (prev && !prev.hasMore) return null;
      return ['audit-activity', prev?.nextCursor ?? null] as const;
    },
    []
  );

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, cursor]) =>
      orpc.audit.activity({
        limit: 50,
        cursor: cursor ? Number(cursor) : undefined,
      }),
    { revalidateFirstPage: false, revalidateOnFocus: false }
  );

  const pages = data ?? [];
  const allGroups = pages.flatMap((p) => p.groups);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allGroups.length === 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        No admin audit activity yet.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {allGroups.map((group, i) => (
        <AuditGroupedEntry key={`${group.latestCreated}-${i}`} group={group} />
      ))}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
          >
            {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AuditLogView() {
  const searchParams = useSearchParams();
  const hasFilters =
    searchParams.has('entityTypes') ||
    searchParams.has('actionTypes') ||
    searchParams.has('adminOnly') ||
    searchParams.has('dateFrom') ||
    searchParams.has('dateTo') ||
    searchParams.has('fieldChanged') ||
    searchParams.has('entityId');

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <AuditFilterPanel />
      </aside>
      <div className="min-w-0 flex-1">
        {hasFilters ? (
          <SearchView searchParams={searchParams} />
        ) : (
          <DefaultView />
        )}
      </div>
    </div>
  );
}
