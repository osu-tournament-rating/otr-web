'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AuditEntityType } from '@otr/core/osu';
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
  getDescendantTypes,
} from '@/lib/audit-entity-types';
import { orpc } from '@/lib/orpc/orpc';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuditDescendantTimeline from './AuditDescendantTimeline';
import AuditEntityTimeline from './AuditEntityTimeline';

const numberFormat = new Intl.NumberFormat('en-US');

type AuditEntityViewProps = {
  entityType: AuditEntityType;
  entityId: number;
};

export default function AuditEntityView({
  entityType,
  entityId,
}: AuditEntityViewProps): React.JSX.Element {
  const [showSystem, setShowSystem] = useState(false);
  const descendantTypes = getDescendantTypes(entityType);

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

  const systemToggle = (
    <div className="flex items-center gap-2">
      <Checkbox
        data-testid="audit-show-system"
        id="audit-show-system"
        checked={showSystem}
        onCheckedChange={(checked) => setShowSystem(checked === true)}
      />
      <label
        htmlFor="audit-show-system"
        className="cursor-pointer text-sm text-muted-foreground"
      >
        Show system events
      </label>
    </div>
  );

  if (descendantTypes.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">{systemToggle}</div>
        <AuditEntityTimeline
          entityType={entityType}
          entityId={entityId}
          showSystem={showSystem}
        />
      </div>
    );
  }

  return (
    <Tabs defaultValue="self" className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList data-testid="audit-scope-tabs">
          <TabsTrigger value="self">
            This {ENTITY_TYPE_LABELS[entityType]}
          </TabsTrigger>
          {descendantTypes.map((descendantType) => {
            const count = descendantCounts?.counts.find(
              (entry) => entry.entityType === descendantType
            );
            return (
              <TabsTrigger
                key={descendantType}
                value={String(descendantType)}
                className="capitalize"
              >
                {ENTITY_TYPE_PLURALS[descendantType]}
                {count && (
                  <span className="text-muted-foreground">
                    {numberFormat.format(count.count)}
                    {count.capped && '+'}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {systemToggle}
      </div>

      <TabsContent value="self">
        <AuditEntityTimeline
          entityType={entityType}
          entityId={entityId}
          showSystem={showSystem}
        />
      </TabsContent>

      {descendantTypes.map((descendantType) => (
        <TabsContent key={descendantType} value={String(descendantType)}>
          <AuditDescendantTimeline
            entityType={entityType}
            entityId={entityId}
            descendantType={descendantType}
            showSystem={showSystem}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
