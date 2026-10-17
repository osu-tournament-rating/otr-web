import { Suspense } from 'react';
import { History } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';

import {
  HeroTabsSkeleton,
  ListToolbarSkeleton,
  PanelSkeleton,
  SkeletonText,
} from '@/components/kit/feedback/Skeletons';
import { PageFrame } from '@/components/kit/layout/PageFrame';
import { PageHeader } from '@/components/kit/layout/PageHeader';
import { getDescendantTypes } from '@/lib/audit-entity-types';
import { TimelineSkeleton } from './AuditEntityTimeline';
import AuditEntityView from './AuditEntityView';
import AuditPageHeader, { type AuditBackLink } from './AuditPageHeader';

/**
 * The audit history panel while it loads: the tab strip (for entities with
 * descendants), the toolbar strip and placeholder rows.
 */
export function AuditHistoryPanelSkeleton({
  tabs,
  label,
}: {
  /** How many tab bars to draw; 0 for an entity without tabs. */
  tabs: number;
  label?: string;
}) {
  return (
    <PanelSkeleton label={label}>
      {/* The tab labels follow the entity and the counts load, so bars. */}
      {tabs > 0 ? <HeroTabsSkeleton tabs={tabs} className="border-b" /> : null}
      {/* The system events switch and the count. */}
      <ListToolbarSkeleton leading="w-44" count />
      <TimelineSkeleton />
    </PanelSkeleton>
  );
}

/**
 * The skeleton's tab bars are sized for the full labels, so four of them run
 * past a phone's tab strip, where a tournament's four loaded tabs fit only
 * with their short labels. Three fit at 320px.
 */
const MAX_TAB_BARS = 3;

/**
 * The entity's own tab and one per descendant type, at most MAX_TAB_BARS, or
 * none without descendants.
 */
function auditTabBars(entityType: AuditEntityType): number {
  const descendants = getDescendantTypes(entityType).length;
  return descendants > 0 ? Math.min(descendants + 1, MAX_TAB_BARS) : 0;
}

/**
 * An audit history route's loading screen, shaped like the page. The name,
 * the back link's wording and the tabs depend on the entity, so they are
 * bars; scores and beatmaps have no tabs. One loading screen serves
 * tournaments, matches and games, which have four, three and two tabs, so
 * it draws two; the strip's height is the same.
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
        tabs={withTabs ? 2 : 0}
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
  back,
}: {
  entityType: AuditEntityType;
  entityId: number;
  entityName?: string;
  /** Overrides the header's back link, as AuditPageHeader's `back`. */
  back?: AuditBackLink;
}) {
  return (
    <PageFrame>
      <AuditPageHeader
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        back={back}
      />
      {/* The view reads its tab and switch from the address. */}
      <Suspense
        fallback={<AuditHistoryPanelSkeleton tabs={auditTabBars(entityType)} />}
      >
        <AuditEntityView entityType={entityType} entityId={entityId} />
      </Suspense>
    </PageFrame>
  );
}
