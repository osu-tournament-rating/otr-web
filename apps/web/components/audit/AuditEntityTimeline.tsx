'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWRInfinite from 'swr/infinite';
import { ClipboardList } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { EntityTimelineItem } from '@/lib/orpc/schema/audit';
import SectionError from '@/components/error/SectionError';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { RowListSkeleton } from '@/components/kit/feedback/Skeletons';
import { RowList } from '@/components/kit/layout/RowList';
import { ListToolbar } from '@/components/kit/lists/ListToolbar';
import { LoadMore } from '@/components/kit/tables/LoadMore';
import { ENTITY_TYPE_LABELS } from '@/lib/audit-entity-types';
import { formatCountOf } from '@/lib/kit/format/number';
import { orpc } from '@/lib/orpc/orpc';
import AuditEntryRow, { AuditSubmissionRow } from './AuditEntryRow';
import AuditNoteItem from './AuditNoteItem';

type TimelineResponse = {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  items: EntityTimelineItem[];
};

/** Entries load 50 at a time. */
export const TIMELINE_BATCH = 50;

/** Placeholder rows while a history loads, inside its panel. */
export function TimelineSkeleton(): React.JSX.Element {
  return (
    <div data-testid="audit-timeline-loading" aria-hidden="true">
      <RowListSkeleton rows={5} leading="none" trailing={false} />
    </div>
  );
}

/** The history's toolbar strip: the system events switch and the count. */
export function TimelineToolbar({
  systemSwitch,
  total,
  capped = false,
}: {
  systemSwitch: React.ReactNode;
  /** Every change, once the first batch has loaded. */
  total?: number;
  /** The count hit the server's cap and is a lower bound. */
  capped?: boolean;
}): React.JSX.Element {
  return (
    <ListToolbar
      label="Filter audit history"
      scope={systemSwitch}
      count={
        total === undefined ? undefined : (
          <span data-testid="timeline-summary">
            {formatCountOf(total, 'change')}
            {capped ? '+' : null}
          </span>
        )
      }
    />
  );
}

/** Scrolls to the entry or note a link points at (`#audit-12`) and tints it briefly. */
function useScrollToHash(ready: boolean) {
  const scrolled = useRef(false);

  useEffect(() => {
    if (!ready || scrolled.current) return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (!el) return;
    scrolled.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('bg-primary/5');
    const timer = setTimeout(() => el.classList.remove('bg-primary/5'), 2000);
    return () => clearTimeout(timer);
  }, [ready]);
}

type AuditEntityTimelineProps = {
  entityType: AuditEntityType;
  entityId: number;
  showSystem?: boolean;
  /** The switch for the toolbar strip, owned by the page. */
  systemSwitch: React.ReactNode;
};

/** An entity's own audit history, newest first, with its admin notes. */
export default function AuditEntityTimeline({
  entityType,
  entityId,
  showSystem = false,
  systemSwitch,
}: AuditEntityTimelineProps): React.JSX.Element {
  const getKey = useCallback(
    (pageIndex: number, previousPageData: TimelineResponse | null) => {
      if (previousPageData && pageIndex >= previousPageData.pages) return null;
      return [
        'audit-entity-timeline',
        entityType,
        entityId,
        showSystem,
        pageIndex + 1,
      ] as const;
    },
    [entityType, entityId, showSystem]
  );

  const { data, error, mutate, size, setSize, isLoading, isValidating } =
    useSWRInfinite(
      getKey,
      async ([, eType, eId, withSystem, page]) =>
        orpc.audit.timeline({
          entityType: eType,
          entityId: eId,
          showSystem: withSystem,
          pageSize: TIMELINE_BATCH,
          page,
        }),
      {
        revalidateFirstPage: false,
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: false,
        dedupingInterval: 300_000,
      }
    );

  const responsePages = data ?? [];
  const allItems = responsePages.flatMap((p) => p.items);
  const totalPages = responsePages[0]?.pages ?? 0;
  const hasMore = size < totalPages;
  const unauditedSubmission = responsePages[0]?.unauditedSubmission ?? null;
  const isEmpty =
    !isLoading && allItems.length === 0 && unauditedSubmission === null;
  const totalCount = responsePages[0]?.total;

  useScrollToHash(allItems.length > 0);

  const toolbar = (
    <TimelineToolbar systemSwitch={systemSwitch} total={totalCount} />
  );

  if (isLoading) {
    return (
      <>
        {toolbar}
        <TimelineSkeleton />
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        {toolbar}
        <SectionError
          title="Audit history could not load"
          retrying={isValidating}
          onRetry={() => void mutate()}
        />
      </>
    );
  }

  if (isEmpty) {
    return (
      <>
        {toolbar}
        <EmptyState
          data-testid="audit-timeline-empty"
          icon={ClipboardList}
          title="No audit history found"
          description={
            showSystem
              ? `No changes have been recorded for this ${ENTITY_TYPE_LABELS[entityType]} yet.`
              : 'No manual changes have been recorded. Enable system events to see automated processing.'
          }
        />
      </>
    );
  }

  return (
    <div data-testid="audit-timeline" className="contents">
      {toolbar}

      <RowList data-testid="timeline-entry-list" aria-label="Audit history">
        {allItems.map((item) => {
          if (item.type === 'audit') {
            return (
              <AuditEntryRow
                key={`a-${item.data.entry.id}`}
                entry={item.data.entry}
                cascadeContext={item.data.cascadeContext}
                viewedEntity={{ entityType, entityId }}
              />
            );
          }
          return <AuditNoteItem key={`n-${item.data.id}`} note={item.data} />;
        })}
        {/* Every tournament without a creation entry predates its other history. */}
        {!hasMore && unauditedSubmission ? (
          <AuditSubmissionRow submission={unauditedSubmission} />
        ) : null}
      </RowList>

      {/* A failed "Load more" keeps the entries already showing. */}
      {error ? (
        <div className="border-t px-4 py-4">
          <SectionError
            size="inline"
            title="More audit history could not load"
            retrying={isValidating}
            onRetry={() => void mutate()}
            className="justify-center"
          />
        </div>
      ) : allItems.length > 0 ? (
        <LoadMore
          hasMore={hasMore}
          loading={isValidating && size > responsePages.length}
          shownCount={allItems.length}
          totalCount={totalCount}
          onLoadMore={() => void setSize(size + 1)}
        />
      ) : null}
    </div>
  );
}
