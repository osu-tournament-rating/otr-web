'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, Layers, Loader2 } from 'lucide-react';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';
import type { BatchEntityInfo } from '@/lib/orpc/schema/audit';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { orpc } from '@/lib/orpc/orpc';
import type { BatchOperation, BatchOperationType } from './batchDetection';
import AuditEntryItem from './AuditEntryItem';
import RelativeTime from './RelativeTime';

const operationConfig: Record<
  BatchOperationType,
  {
    verificationStatus?: VerificationStatus;
    icon?: typeof Layers;
    iconColor?: string;
    label?: string;
    borderColor: string;
  }
> = {
  submission: {
    icon: Layers,
    iconColor: 'text-green-500',
    label: 'created',
    borderColor: 'border-l-green-500',
  },
  verification: {
    verificationStatus: VerificationStatus.Verified,
    borderColor: 'border-l-violet-400',
  },
  rejection: {
    verificationStatus: VerificationStatus.Rejected,
    borderColor: 'border-l-violet-400',
  },
  pre_verification: {
    verificationStatus: VerificationStatus.PreVerified,
    borderColor: 'border-l-violet-300',
  },
  pre_rejection: {
    verificationStatus: VerificationStatus.PreRejected,
    borderColor: 'border-l-violet-300',
  },
  bulk_update: {
    icon: Layers,
    iconColor: 'text-blue-500',
    label: 'bulk updated',
    borderColor: 'border-l-blue-500',
  },
};

function getUserInitials(username: string | null | undefined): string {
  if (!username) return '?';
  return username
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function pluralize(word: string, count: number): string {
  if (count === 1) return word;
  const lower = word.toLowerCase();
  if (
    lower.endsWith('ch') ||
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('sh')
  ) {
    return word + 'es';
  }
  return word + 's';
}

/** Entity type hierarchy order (highest to lowest) */
const ENTITY_HIERARCHY: AuditEntityType[] = [
  AuditEntityType.Tournament,
  AuditEntityType.Match,
  AuditEntityType.Game,
  AuditEntityType.Score,
];

/** Display label for each entity type */
const ENTITY_LABEL: Record<AuditEntityType, string> = {
  [AuditEntityType.Tournament]: 'tournament',
  [AuditEntityType.Match]: 'match',
  [AuditEntityType.Game]: 'game',
  [AuditEntityType.Score]: 'score',
};

/** Generate a link href for an entity */
function entityHref(entityType: AuditEntityType, entityId: number): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return `/tournaments/${entityId}`;
    case AuditEntityType.Match:
      return `/matches/${entityId}`;
    case AuditEntityType.Game:
      return `/audit/games/${entityId}`;
    case AuditEntityType.Score:
      return `/audit/scores/${entityId}`;
  }
}

/**
 * Build the inline entity description for the action line.
 * e.g. "229 games" or "1 tournament, 15 matches"
 */
function buildEntityDescription(batch: BatchOperation, excludeType?: AuditEntityType): string {
  const sorted = [...batch.entityBreakdown]
    .filter((b) => excludeType === undefined || b.entityType !== excludeType)
    .sort(
    (a, b) =>
      ENTITY_HIERARCHY.indexOf(a.entityType) -
      ENTITY_HIERARCHY.indexOf(b.entityType)
  );

  return sorted
    .map((b) => {
      const label = ENTITY_LABEL[b.entityType];
      return `${b.count} ${pluralize(label, b.count)}`;
    })
    .join(', ');
}

/**
 * Get the tournament name and href from the batch's parent entity.
 */
function getTournamentInfo(batch: BatchOperation): { name: string; id: number; href: string } | null {
  if (!batch.tournamentName || !batch.parentEntityId) return null;
  return {
    name: batch.tournamentName,
    id: batch.parentEntityId,
    href: `/tournaments/${batch.parentEntityId}`,
  };
}

/** Lazy-loaded changelog for a single entity within a batch */
function EntityChangelog({
  entityType,
  entityId,
}: {
  entityType: AuditEntityType;
  entityId: number;
}) {
  const { data, isLoading } = useSWR(
    ['batch-entity-changelog', entityType, entityId],
    () =>
      orpc.audit.timeline({
        entityType,
        entityId,
        limit: 50,
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 86400000,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  const entries = data?.items.filter((item) => item.type === 'audit') ?? [];
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground py-2 text-center text-xs">
        No changes found
      </div>
    );
  }

  return (
    <div className="divide-border divide-y">
      {entries.map((item) => (
        <AuditEntryItem key={item.data.id} entry={item.data} />
      ))}
    </div>
  );
}

/** A single entity row with expandable changelog */
function BatchEntityRow({
  entityType,
  entity,
}: {
  entityType: AuditEntityType;
  entity: BatchEntityInfo;
}) {
  const [expanded, setExpanded] = useState(false);
  const href = entityHref(entityType, entity.id);
  const displayName = entity.name ?? `#${entity.id}`;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="hover:bg-accent/50 flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors">
          <ChevronRight
            className={cn(
              'text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform',
              expanded && 'rotate-90'
            )}
          />
          <Link
            href={href}
            className="text-foreground hover:text-primary min-w-0 truncate font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {displayName}
          </Link>
          {entity.name && (
            <span className="text-muted-foreground shrink-0 text-xs">
              #{entity.id}
            </span>
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-muted/20 border-border border-t">
          <EntityChangelog entityType={entityType} entityId={entity.id} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Lazy-loaded entity list for the expanded batch view */
function BatchEntityList({ batch }: { batch: BatchOperation }) {
  const { data, isLoading } = useSWR(
    [
      'batch-entity-ids',
      batch.actionUserId,
      batch.parentEntityId,
    ],
    () =>
      orpc.audit.batchEntityIds({
        actionUserId: batch.actionUserId,
        parentEntityId: batch.parentEntityId,
        timeFrom: batch.earliestCreated,
        timeTo: batch.latestCreated,
        entityTypes: batch.entityBreakdown.map((b) => b.entityType),
      }),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 86400000,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!data?.entities.length) {
    return (
      <div className="text-muted-foreground py-3 text-center text-sm">
        No entities found
      </div>
    );
  }

  // Sort by hierarchy
  const sorted = [...data.entities].sort(
    (a, b) =>
      ENTITY_HIERARCHY.indexOf(a.entityType) -
      ENTITY_HIERARCHY.indexOf(b.entityType)
  );

  return (
    <div className="divide-border divide-y">
      {sorted.map(({ entityType, items, ids }) => {
        const entityItems = items ?? ids.map((id) => ({ id, name: null }));
        if (entityItems.length === 0) return null;
        const meta = AuditEntityTypeEnumHelper.getMetadata(entityType);
        return (
          <div key={entityType}>
            <div className="text-muted-foreground bg-muted/30 border-border border-b px-4 py-1.5 text-xs font-medium">
              {pluralize(meta.text, entityItems.length)} ({entityItems.length})
            </div>
            {entityItems.map((entity) => (
              <BatchEntityRow
                key={entity.id}
                entityType={entityType}
                entity={entity}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditBatchOperationEntry({
  batch,
}: {
  batch: BatchOperation;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const config = operationConfig[batch.type];
  const username = batch.actionUser?.username;
  const initials = getUserInitials(username);
  const tournamentInfo = getTournamentInfo(batch);
  const entityDescription = buildEntityDescription(batch);
  // For batches with a tournament parent, show child entity counts (excluding tournament itself)
  const childEntityDescription = tournamentInfo
    ? buildEntityDescription(batch, AuditEntityType.Tournament)
    : '';
  // For non-tournament batches with a tournament parent, show "N matches in <tournament>"
  const hasNonTournamentEntities = batch.entityBreakdown.some(
    (b) => b.entityType !== AuditEntityType.Tournament
  );

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div
        className={cn(
          'border-border overflow-hidden rounded-lg border border-l-4 transition-colors',
          config.borderColor,
          expanded ? 'bg-card border-border' : 'border-border/50 hover:border-border hover:bg-card/50'
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3 text-left">
            {/* User Avatar */}
            {batch.actionUser?.osuId ? (
              <OsuAvatar
                osuId={batch.actionUser.osuId}
                username={username}
                size={32}
                className="shrink-0"
              />
            ) : (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Content */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {/* Action line: User + action + inline entity counts */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                {batch.actionUser ? (
                  <Link
                    href={`/players/${batch.actionUser.playerId}`}
                    className="text-primary font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {username ?? `User ${batch.actionUser.id}`}
                  </Link>
                ) : (
                  <span className="text-muted-foreground italic">System</span>
                )}
                {config.verificationStatus !== undefined ? (
                  <VerificationBadge
                    verificationStatus={config.verificationStatus}
                    displayText
                    size="small"
                    minimal
                  />
                ) : (
                  <span className="text-muted-foreground">
                    {batch.type === 'bulk_update' && batch.totalCount === 1
                      ? 'updated'
                      : config.label}
                  </span>
                )}
                {/* Inline entity counts */}
                {tournamentInfo ? (
                  hasNonTournamentEntities ? (
                    <>
                      {/* "N matches in <tournament>" or "N matches, M games in <tournament>" */}
                      <span className="text-foreground font-medium">
                        {childEntityDescription || entityDescription}
                      </span>
                      {batch.type === 'submission' ? (
                        <>
                          <span className="text-muted-foreground">tournament</span>
                          <Link
                            href={tournamentInfo.href}
                            className="text-foreground font-medium hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tournamentInfo.name}
                          </Link>
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground">in</span>
                          <Link
                            href={tournamentInfo.href}
                            className="text-foreground font-medium hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tournamentInfo.name}
                          </Link>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Tournament-only: "<tournament name>" */}
                      {batch.type === 'submission' && (
                        <span className="text-muted-foreground">tournament</span>
                      )}
                      <Link
                        href={tournamentInfo.href}
                        className="text-foreground font-medium hover:text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tournamentInfo.name}
                      </Link>
                    </>
                  )
                ) : (
                  <span className="text-foreground font-medium">
                    {entityDescription}
                  </span>
                )}
              </div>
            </div>

            {/* Timestamp and expand indicator */}
            <div className="flex shrink-0 items-center gap-2">
              <RelativeTime
                dateString={batch.latestCreated}
                className="text-muted-foreground text-xs"
              />
              <ChevronRight
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  expanded && 'rotate-90'
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="bg-muted/20 border-border border-t">
            <BatchEntityList batch={batch} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
