'use client';

import { Fetcher } from 'swr';
import { useEffect, useRef } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import useSWRInfinite, { SWRInfiniteKeyLoader } from 'swr/infinite';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { orpc } from '@/lib/orpc/orpc';
import {
  AuditListInput,
  AuditListResponse,
  AuditRecord,
} from '@/lib/orpc/schema/audit';

import AuditListItem from './AuditListItem';

const pageSize = 50;

type AuditListFilter = {
  entityType?: number;
  userActionsOnly: boolean;
  actionUserId?: number;
  sort: 'created' | 'id';
  descending: boolean;
};

const serializeFilter = (
  filter: AuditListFilter,
  cursor: number | undefined
): AuditListInput => ({
  entityType: filter.entityType as AuditListInput['entityType'],
  userActionsOnly: filter.userActionsOnly,
  actionUserId: filter.actionUserId,
  sort: filter.sort,
  descending: filter.descending,
  cursor,
  limit: pageSize,
});

const fetcher = (): Fetcher<AuditListResponse, AuditListInput> => {
  return async (params) => await orpc.audits.list(params);
};

const getKey = (
  filter: AuditListFilter
): SWRInfiniteKeyLoader<AuditListResponse, AuditListInput | null> => {
  return (index, previous) => {
    if (previous && !previous.hasMore) {
      return null;
    }

    const cursor =
      index === 0 ? undefined : (previous?.nextCursor ?? undefined);
    return serializeFilter(filter, cursor);
  };
};

export default function AuditList({ filter }: { filter: AuditListFilter }) {
  const { data, error, setSize, isValidating, isLoading } = useSWRInfinite(
    getKey(filter),
    fetcher(),
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
    }
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const auditData: AuditRecord[] = data ? data.flatMap((d) => d.audits) : [];
  const expectNextPage = data?.at(-1)?.hasMore ?? false;

  const virtualizer = useWindowVirtualizer({
    count: Math.max(auditData.length + 1, 1),
    estimateSize: () => 120,
    overscan: 5,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  const virtualizedItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualizedItems.at(-1);

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= auditData.length &&
      expectNextPage &&
      !isLoading &&
      !isValidating
    ) {
      setSize((size) => size + 1);
    }
  }, [
    expectNextPage,
    isLoading,
    isValidating,
    setSize,
    auditData.length,
    virtualizedItems,
  ]);

  if (error) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-destructive text-lg font-bold">
          Failed to load audit logs
        </h3>
        <p className="text-muted-foreground mt-2">Please try again later.</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col space-y-2">
        {[...Array(6)].map((_, idx) => (
          <ListItemSkeleton key={idx} />
        ))}
      </div>
    );
  }

  return (
    <div ref={listRef}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 w-full space-y-2"
          style={{
            transform: `translateY(${
              (virtualizedItems[0]?.start ?? 0) -
              virtualizer.options.scrollMargin
            }px)`,
          }}
        >
          {virtualizedItems.map((item) => {
            if (auditData.length === 0 && item.index === 0) {
              return (
                <div
                  className="relative w-full"
                  key={item.key}
                  data-index={item.index}
                  ref={virtualizer.measureElement}
                >
                  <NoResultsCard />
                </div>
              );
            }

            const isPlaceholder = item.index >= auditData.length;

            return (
              <div
                className="relative w-full pb-1"
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
              >
                {isPlaceholder ? (
                  expectNextPage ? (
                    <ListItemSkeleton />
                  ) : null
                ) : (
                  <AuditListItem audit={auditData[item.index]} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ListItemSkeleton() {
  return <Skeleton className="h-28 w-full rounded-xl" />;
}

function NoResultsCard() {
  return (
    <Card className="p-6 font-sans">
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <h3 className="text-primary text-2xl font-bold">No audit logs found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters to see more results.
        </p>
      </div>
    </Card>
  );
}
