import { Suspense } from 'react';
import { History } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';

import {
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { getDescendantTypes } from '@/lib/audit-entity-types';
import { TimelineSkeleton } from './AuditEntityTimeline';
import AuditEntityView from './AuditEntityView';
import AuditPageHeader from './AuditPageHeader';

/**
 * The audit history panel while it loads: the tab strip (for entities with
 * descendants), the toolbar strip and placeholder rows.
 */
export function AuditHistoryPanelSkeleton({
  withTabs,
  label,
}: {
  withTabs: boolean;
  label?: string;
}) {
  return (
    <PanelSkeleton label={label}>
      {/* box-content: the strips' borders sit under their 44, 56 and 64px. */}
      {withTabs ? <div className="box-content h-11 border-b" /> : null}
      <div className="box-content h-14 border-b bg-muted/20 sm:h-16 dark:bg-muted" />
      <TimelineSkeleton />
    </PanelSkeleton>
  );
}

/**
 * An audit history route's loading screen, shaped like the page. The name,
 * the back link's wording and the tabs depend on the entity, so they are
 * bars; scores and beatmaps have no tabs.
 */
export function AuditHistoryLoading({ withTabs }: { withTabs: boolean }) {
  return (
    <PageFrame>
      {/* The header's back link: this 16px bar and the frame's 16px gap
          take the link's line and margin, so the title doesn't move. */}
      <div aria-hidden="true" className="flex h-4">
        <SkeletonText className="w-28" />
      </div>
      <PageHeader
        icon={History}
        title={<SkeletonText className="h-7 w-72" />}
        description={<SkeletonText className="w-56" />}
      />
      <AuditHistoryPanelSkeleton
        withTabs={withTabs}
        label="Loading audit history"
      />
    </PageFrame>
  );
}

/** One entity's audit history page: its header, then the history panel. */
export default function AuditHistoryPage({
  entityType,
  entityId,
  entityName,
}: {
  entityType: AuditEntityType;
  entityId: number;
  entityName?: string;
}) {
  return (
    <PageFrame>
      <AuditPageHeader
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
      />
      {/* The view reads its tab and switch from the address. */}
      <Suspense
        fallback={
          <AuditHistoryPanelSkeleton
            withTabs={getDescendantTypes(entityType).length > 0}
          />
        }
      >
        <AuditEntityView entityType={entityType} entityId={entityId} />
      </Suspense>
    </PageFrame>
  );
}
