'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { ChevronRight } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { DescendantAuditItem } from '@/lib/orpc/schema/audit';
import {
  entityTypeToSlug,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
} from '@/lib/audit-entity-types';
import { orpc } from '@/lib/orpc/orpc';
import AuditEntryRow from './AuditEntryRow';
import {
  LoadMoreButton,
  TimelineEmptyState,
  TimelineSkeleton,
  TimelineSummary,
} from './AuditEntityTimeline';

type DescendantResponse = {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  totalCapped: boolean;
  items: DescendantAuditItem[];
};

function titleCase(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function EntityHeading({
  entity,
}: {
  entity: DescendantAuditItem['entity'];
}): React.JSX.Element {
  const label = ENTITY_TYPE_LABELS[entity.entityType];

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {entity.path.map((ancestor) => (
        <span
          key={`${ancestor.entityType}-${ancestor.entityId}`}
          className="flex items-center gap-1"
        >
          <Link
            href={`/audit/${entityTypeToSlug(ancestor.entityType)}/${ancestor.entityId}`}
            className="hover:text-foreground hover:underline"
          >
            {ancestor.entityName ??
              `${titleCase(ENTITY_TYPE_LABELS[ancestor.entityType])} #${ancestor.entityId}`}
          </Link>
          <ChevronRight className="h-3 w-3" />
        </span>
      ))}
      <Link
        href={`/audit/${entityTypeToSlug(entity.entityType)}/${entity.entityId}`}
        className="font-medium text-primary hover:underline"
      >
        {entity.entityName ?? `${titleCase(label)} #${entity.entityId}`}
      </Link>
    </div>
  );
}

type AuditDescendantTimelineProps = {
  entityType: AuditEntityType;
  entityId: number;
  descendantType: AuditEntityType;
  showSystem?: boolean;
};

export default function AuditDescendantTimeline({
  entityType,
  entityId,
  descendantType,
  showSystem = false,
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

  const { data, size, setSize, isLoading, isValidating } = useSWRInfinite(
    getKey,
    async ([, eType, eId, dType, withSystem, page]) =>
      orpc.audit.descendants({
        entityType: eType,
        entityId: eId,
        descendantType: dType,
        showSystem: withSystem,
        pageSize: 50,
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

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (allItems.length === 0) {
    return (
      <TimelineEmptyState
        title={`No ${plural} changed`}
        description={
          showSystem
            ? `No changes have been recorded against this ${ENTITY_TYPE_LABELS[entityType]}'s ${plural}.`
            : `No manual changes have been recorded against this ${ENTITY_TYPE_LABELS[entityType]}'s ${plural}. Enable system events to see automated processing.`
        }
      />
    );
  }

  return (
    <div data-testid="audit-descendant-timeline" className="space-y-4">
      <TimelineSummary
        total={responsePages[0]?.total ?? allItems.length}
        hasMore={hasMore}
        latestChange={allItems[0]?.entry.created ?? null}
        capped={responsePages[0]?.totalCapped}
      />

      <div
        data-testid="timeline-entry-list"
        className="divide-y divide-border rounded-lg border border-border"
      >
        {allItems.map((item) => (
          <AuditEntryRow
            key={`${item.entity.entityId}-${item.entry.id}`}
            entry={item.entry}
            heading={<EntityHeading entity={item.entity} />}
          />
        ))}
      </div>

      {hasMore && (
        <LoadMoreButton
          onClick={() => setSize(size + 1)}
          disabled={isValidating}
        />
      )}
    </div>
  );
}
