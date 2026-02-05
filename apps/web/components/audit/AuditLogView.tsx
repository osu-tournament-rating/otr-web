'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { ClipboardList, Loader2 } from 'lucide-react';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';
import type {
  AuditTimelineItem,
  AuditGroupedEntry as AuditGroupedEntryType,
  FieldFilter,
} from '@/lib/orpc/schema/audit';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import AuditFilterBar from './AuditFilterBar';
import AuditEntryItem from './AuditEntryItem';
import AuditGroupedEntry from './AuditGroupedEntry';
import { parseFieldOptionValue } from './auditFieldConfig';

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

function LoadingSkeleton() {
  return (
    <div className="border-border divide-border divide-y rounded-lg border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <ClipboardList className="text-muted-foreground/50 mb-4 h-12 w-12" />
      <h3 className="text-lg font-medium">No audit entries found</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {hasFilters
          ? 'Try adjusting your filters to find what you\'re looking for.'
          : 'No admin audit activity yet.'}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear} className="mt-4">
          Clear filters
        </Button>
      )}
    </div>
  );
}

interface SearchViewProps {
  searchParams: URLSearchParams;
  onClearFilters: () => void;
}

function SearchView({ searchParams, onClearFilters }: SearchViewProps) {
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
      // Parse fieldChanged values from "entityType:fieldName" format
      const fieldChangedParam = searchParams.get('fieldChanged');
      let fieldsChanged: FieldFilter[] | undefined;
      if (fieldChangedParam) {
        const parsed = fieldChangedParam.split(',').map(parseFieldOptionValue).filter(Boolean) as FieldFilter[];
        if (parsed.length > 0) {
          fieldsChanged = parsed;
        }
      }

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
        fieldsChanged,
        entityId: searchParams.get('entityId')
          ? Number(searchParams.get('entityId'))
          : undefined,
        limit: 250,
        cursor: cursor ?? undefined,
      });
    },
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 86400000, // 24 hours - audits never change
    }
  );

  const pages = data ?? [];
  const allItems = pages.flatMap((p) => p.items);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allItems.length === 0;
  const totalCount = allItems.length;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isEmpty) {
    return <EmptyState hasFilters onClear={onClearFilters} />;
  }

  return (
    <div className="space-y-4">
      {/* Result count */}
      <div className="text-muted-foreground text-sm">
        Showing {totalCount} result{totalCount !== 1 ? 's' : ''}
        {hasMore && '+'}
      </div>

      {/* Results */}
      <div className="border-border divide-border divide-y rounded-lg border">
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
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
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

function DefaultView({ onClearFilters }: { onClearFilters: () => void }) {
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
        limit: 250,
        cursor: cursor ? Number(cursor) : undefined,
      }),
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 86400000, // 24 hours - audits never change
    }
  );

  const pages = data ?? [];
  const allGroups = pages.flatMap((p) => p.groups);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && allGroups.length === 0;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isEmpty) {
    return <EmptyState hasFilters={false} onClear={onClearFilters} />;
  }

  return (
    <div className="space-y-4">
      {/* Activity feed */}
      <div className="space-y-2">
        {allGroups.map((group, i) => (
          <AuditGroupedEntry key={`${group.latestCreated}-${i}`} group={group} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasFilters = useMemo(() => {
    return (
      searchParams.has('entityTypes') ||
      searchParams.has('actionTypes') ||
      searchParams.has('adminOnly') ||
      searchParams.has('dateFrom') ||
      searchParams.has('dateTo') ||
      searchParams.has('fieldChanged') ||
      searchParams.has('entityId')
    );
  }, [searchParams]);

  const handleClearFilters = useCallback(() => {
    router.push('/tools/audit-logs');
  }, [router]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar */}
      <AuditFilterBar />

      {/* Content - automatically switch view based on filters */}
      <div className="mt-2">
        {hasFilters ? (
          <SearchView searchParams={searchParams} onClearFilters={handleClearFilters} />
        ) : (
          <DefaultView onClearFilters={handleClearFilters} />
        )}
      </div>
    </div>
  );
}
