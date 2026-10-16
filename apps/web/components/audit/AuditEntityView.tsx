'use client';

import useSWR from 'swr';
import { AuditEntityType } from '@otr/core/osu';
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
  getDescendantTypes,
} from '@/lib/audit-entity-types';
import { HeroTabs, type HeroTabItem } from '@/components/kit/layout/HeroTabs';
import { Panel } from '@/components/kit/layout/Panel';
import { formatCount } from '@/lib/kit/format/number';
import { useListState } from '@/lib/kit/lists/use-list-state';
import { orpc } from '@/lib/orpc/orpc';
import AuditDescendantTimeline from './AuditDescendantTimeline';
import AuditEntityTimeline from './AuditEntityTimeline';
import { AUDIT_HISTORY_PARAMS, getEntityTypeName } from './auditParams';
import { AuditSystemSwitch } from './AuditSystemSwitch';

type AuditEntityViewProps = {
  entityType: AuditEntityType;
  entityId: number;
};

/**
 * An entity's audit history on one panel: tabs for its own changes and its
 * descendants' (matches, games, scores), then the toolbar strip with the
 * system events switch, the rows and "Load more". The tab and the switch
 * live in the page address.
 */
export default function AuditEntityView({
  entityType,
  entityId,
}: AuditEntityViewProps): React.JSX.Element {
  const list = useListState(AUDIT_HISTORY_PARAMS);
  const showSystem = list.state.system;
  const descendantTypes = getDescendantTypes(entityType);
  const descendantType = descendantTypes.find(
    (type) => ENTITY_TYPE_PLURALS[type] === list.state.tab
  );

  const { data: descendantCounts } = useSWR(
    descendantTypes.length > 0
      ? (['audit-descendant-counts', entityType, entityId, showSystem] as const)
      : null,
    async ([, type, id, withSystem]) =>
      orpc.audit.descendantCounts({
        entityType: type,
        entityId: id,
        showSystem: withSystem,
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 300_000,
    }
  );

  const systemSwitch = (
    <AuditSystemSwitch
      data-testid="audit-show-system"
      checked={showSystem}
      onCheckedChange={(system) => list.setState({ system })}
    />
  );

  // On phones the first tab drops "This" and the counts hide (screen
  // readers still hear both), so all four tabs fit without scrolling; the
  // toolbar still counts the open tab's changes.
  const tabs: HeroTabItem[] = [
    {
      value: 'self',
      label: `This ${ENTITY_TYPE_LABELS[entityType]}`,
      compactLabel: getEntityTypeName(entityType),
      href: list.hrefFor({ tab: 'self' }),
      testId: 'audit-tab-self',
    },
    ...descendantTypes.map((type) => {
      const plural = ENTITY_TYPE_PLURALS[type];
      const count = descendantCounts?.counts.find(
        (entry) => entry.entityType === type
      );
      return {
        value: plural,
        label: plural.charAt(0).toUpperCase() + plural.slice(1),
        count: count
          ? `${formatCount(count.count)}${count.capped ? '+' : ''}`
          : undefined,
        href: list.hrefFor({ tab: plural as typeof list.state.tab }),
        testId: `audit-tab-${plural}`,
      };
    }),
  ];

  return (
    <Panel data-testid="audit-history" aria-label="Audit history">
      {descendantTypes.length > 0 ? (
        <HeroTabs
          data-testid="audit-scope-tabs"
          aria-label="Audit history views"
          value={descendantType ? list.state.tab : 'self'}
          items={tabs}
          countsFrom="sm"
          className="border-b"
        />
      ) : null}

      {descendantType !== undefined ? (
        <AuditDescendantTimeline
          key={descendantType}
          entityType={entityType}
          entityId={entityId}
          descendantType={descendantType}
          showSystem={showSystem}
          systemSwitch={systemSwitch}
        />
      ) : (
        <AuditEntityTimeline
          entityType={entityType}
          entityId={entityId}
          showSystem={showSystem}
          systemSwitch={systemSwitch}
        />
      )}
    </Panel>
  );
}
