'use client';

import { useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { ClipboardList } from 'lucide-react';
import type { AuditEvent, FieldFilter } from '@/lib/orpc/schema/audit';
import SectionError from '@/components/error/SectionError';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { RowListSkeleton } from '@/components/kit/feedback/Skeletons';
import { Panel } from '@/components/kit/layout/Panel';
import { RowList } from '@/components/kit/layout/RowList';
import { LoadMore } from '@/components/kit/tables/LoadMore';
import type { ListState } from '@/lib/kit/lists/params';
import { useListState } from '@/lib/kit/lists/use-list-state';
import { orpc } from '@/lib/orpc/orpc';
import AuditEventCard from './AuditEventCard';
import AuditFilterBar from './AuditFilterBar';
import {
  AUDIT_LOG_PARAMS,
  getAuditFieldOption,
  toAuditActionType,
  toAuditEntityType,
} from './auditParams';

type EventFeedResponse = {
  events: AuditEvent[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** The audit log loads 30 events at a time. */
const EVENT_BATCH = 30;

/** The feed's request filters, from the list state in the address. */
function toFeedFilters(state: ListState<typeof AUDIT_LOG_PARAMS>) {
  const entityTypes = state.entity
    .map(toAuditEntityType)
    .filter((type) => type !== undefined);
  const fieldsChanged: FieldFilter[] = state.field.flatMap((value) => {
    const option = getAuditFieldOption(value);
    return option
      ? [{ entityType: option.entityType, fieldName: option.field }]
      : [];
  });
  const actionTypes = state.action.map(toAuditActionType);

  return {
    showSystem: state.system ? true : undefined,
    entityTypes: entityTypes.length > 0 ? entityTypes : undefined,
    fieldsChanged: fieldsChanged.length > 0 ? fieldsChanged : undefined,
    actionTypes: actionTypes.length > 0 ? actionTypes : undefined,
  };
}

/** The panel's placeholder rows while the first batch loads. */
export function AuditFeedRowsSkeleton() {
  return (
    <div data-testid="audit-feed-loading" aria-hidden="true">
      <RowListSkeleton rows={6} leading="none" trailing={false} />
    </div>
  );
}

/**
 * The audit log: one panel with its toolbar strip, a row per event, and
 * "Load more" at the bottom. Filters live in the page address.
 */
export default function AuditEventFeed(): React.JSX.Element {
  const list = useListState(AUDIT_LOG_PARAMS);
  const filters = toFeedFilters(list.state);
  const filterKey = JSON.stringify(filters);

  const getKey = useCallback(
    (_pageIndex: number, previousPageData: EventFeedResponse | null) => {
      if (previousPageData && !previousPageData.hasMore) return null;
      const cursor = previousPageData?.nextCursor ?? null;
      return ['audit-events', cursor, filterKey] as const;
    },
    [filterKey]
  );

  const { data, error, mutate, size, setSize, isLoading, isValidating } =
    useSWRInfinite(
      getKey,
      async ([, cursor, key]) =>
        orpc.audit.events({
          limit: EVENT_BATCH,
          cursor: cursor ?? undefined,
          ...(JSON.parse(key) as ReturnType<typeof toFeedFilters>),
        }),
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: false,
        dedupingInterval: 60_000,
      }
    );

  const pages = data ?? [];
  const allEvents = pages.flatMap((page) => page.events);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const isEmpty = !isLoading && !error && allEvents.length === 0;
  const isFiltered = list.activeFilterCount > 0;
  // A failed "Load more" keeps the events already showing.
  const loadMoreFailed = Boolean(error) && allEvents.length > 0;

  return (
    <Panel data-testid="audit-event-feed">
      <AuditFilterBar list={list} />

      {isLoading ? (
        <AuditFeedRowsSkeleton />
      ) : error && allEvents.length === 0 ? (
        <SectionError
          title="Audit events could not load"
          retrying={isValidating}
          onRetry={() => void mutate()}
        />
      ) : isEmpty ? (
        <EmptyState
          data-testid="audit-feed-empty"
          icon={ClipboardList}
          title={isFiltered ? 'No audit events match' : 'No audit events found'}
          description={
            isFiltered
              ? 'Try fewer filters or clear them.'
              : 'No audit activity has been recorded yet.'
          }
          clearFilters={isFiltered ? { onClick: list.clearFilters } : undefined}
        />
      ) : (
        <>
          <RowList data-testid="audit-event-list" aria-label="Audit events">
            {allEvents.map((event) => (
              <AuditEventCard key={event.eventKey} event={event} />
            ))}
          </RowList>
          {loadMoreFailed ? (
            <div className="border-t px-4 py-4">
              <SectionError
                size="inline"
                title="More audit events could not load"
                retrying={isValidating}
                onRetry={() => void mutate()}
                className="justify-center"
              />
            </div>
          ) : (
            <LoadMore
              data-testid="audit-load-more"
              hasMore={hasMore}
              loading={isValidating && size > pages.length}
              shownCount={allEvents.length}
              onLoadMore={() => void setSize(size + 1)}
            />
          )}
        </>
      )}
    </Panel>
  );
}
