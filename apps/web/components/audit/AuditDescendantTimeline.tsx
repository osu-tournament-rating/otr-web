'use client';

import { Fragment, useCallback } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { DescendantAuditItem } from '@/lib/orpc/schema/audit';
import {
  entityTypeToSlug,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
} from '@/lib/audit-entity-types';
import SectionError from '@/components/error/SectionError';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { RowList } from '@/components/kit/layout/RowList';
import { LoadMore } from '@/components/kit/tables/LoadMore';
import { formatId } from '@/lib/kit/format/number';
import { orpc } from '@/lib/orpc/orpc';
import { cn } from '@/lib/utils';
import AuditEntryRow from './AuditEntryRow';
import {
  TIMELINE_BATCH,
  TimelineSkeleton,
  TimelineToolbar,
} from './AuditEntityTimeline';
import { AUDIT_INLINE_LINK } from './AuditRow';
import { getEntityTypeName, nameOr } from './auditParams';

type DescendantResponse = {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  totalCapped: boolean;
  items: DescendantAuditItem[];
};

/** Where the changed entity sits: its ancestors, then its own name. */
function EntityHeading({
  entity,
}: {
  entity: DescendantAuditItem['entity'];
}): React.JSX.Element {
  const name = (
    entityType: AuditEntityType,
    entityId: number,
    entityName: string | null
  ) =>
    nameOr(
      entityName,
      `${getEntityTypeName(entityType)} #${formatId(entityId)}`
    );

  return (
    <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
      {entity.path.map((ancestor) => (
        <Fragment key={`${ancestor.entityType}-${ancestor.entityId}`}>
          <Link
            href={`/audit/${entityTypeToSlug(ancestor.entityType)}/${ancestor.entityId}`}
            prefetch={false}
            className={cn(AUDIT_INLINE_LINK, 'text-muted-foreground')}
          >
            {name(ancestor.entityType, ancestor.entityId, ancestor.entityName)}
          </Link>
          <ChevronRight aria-hidden="true" className="size-3 shrink-0" />
        </Fragment>
      ))}
      <Link
        href={`/audit/${entityTypeToSlug(entity.entityType)}/${entity.entityId}`}
        prefetch={false}
        className={cn(AUDIT_INLINE_LINK, 'font-medium')}
      >
        {name(entity.entityType, entity.entityId, entity.entityName)}
      </Link>
    </p>
  );
}

type AuditDescendantTimelineProps = {
  entityType: AuditEntityType;
  entityId: number;
  descendantType: AuditEntityType;
  showSystem?: boolean;
  /** The switch for the toolbar strip, owned by the page. */
  systemSwitch: React.ReactNode;
};

/** Changes to an entity's matches, games or scores, newest first. */
export default function AuditDescendantTimeline({
  entityType,
  entityId,
  descendantType,
  showSystem = false,
  systemSwitch,
}: AuditDescendantTimelineProps): React.JSX.Element {
  const getKey = useCallback(
    (pageIndex: number, previousPageData: DescendantResponse | null) => {
      if (previousPageData && pageIndex >= previousPageData.pages) return null;
      return [
        'audit-descendant-timeline',
        entityType,
        entityId,
        descendantType,
        showSystem,
        pageIndex + 1,
      ] as const;
    },
    [entityType, entityId, descendantType, showSystem]
  );

  const { data, error, mutate, size, setSize, isLoading, isValidating } =
    useSWRInfinite(
      getKey,
      async ([, eType, eId, dType, withSystem, page]) =>
        orpc.audit.descendants({
          entityType: eType,
          entityId: eId,
          descendantType: dType,
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
  const plural = ENTITY_TYPE_PLURALS[descendantType];
  const total = responsePages[0]?.total;
  const capped = responsePages[0]?.totalCapped ?? false;

  const toolbar = (
    <TimelineToolbar
      systemSwitch={systemSwitch}
      total={total}
      capped={capped}
    />
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
          title={`Changed ${plural} could not load`}
          retrying={isValidating}
          onRetry={() => void mutate()}
        />
      </>
    );
  }

  if (allItems.length === 0) {
    return (
      <>
        {toolbar}
        <EmptyState
          data-testid="audit-timeline-empty"
          icon={ClipboardList}
          title={`No ${plural} changed`}
          description={
            showSystem
              ? `No changes have been recorded against this ${ENTITY_TYPE_LABELS[entityType]}'s ${plural}.`
              : `No manual changes have been recorded against this ${ENTITY_TYPE_LABELS[entityType]}'s ${plural}. Enable system events to see automated processing.`
          }
        />
      </>
    );
  }

  return (
    <div data-testid="audit-descendant-timeline" className="contents">
      {toolbar}

      <RowList
        data-testid="timeline-entry-list"
        aria-label={`Changed ${plural}`}
      >
        {allItems.map((item) => (
          <AuditEntryRow
            key={`${item.entity.entityId}-${item.entry.id}`}
            entry={item.entry}
            heading={<EntityHeading entity={item.entity} />}
          />
        ))}
      </RowList>

      {/* A failed "Load more" keeps the changes already showing. */}
      {error ? (
        <div className="border-t px-4 py-4">
          <SectionError
            size="inline"
            title={`More changed ${plural} could not load`}
            retrying={isValidating}
            onRetry={() => void mutate()}
            className="justify-center"
          />
        </div>
      ) : (
        <LoadMore
          hasMore={hasMore}
          loading={isValidating && size > responsePages.length}
          shownCount={allItems.length}
          totalCount={capped ? null : total}
          onLoadMore={() => void setSize(size + 1)}
        />
      )}
    </div>
  );
}
