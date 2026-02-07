'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronRight, Layers, Loader2 } from 'lucide-react';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { AuditEntityTypeEnumHelper } from '@/lib/enums';
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
 * Get the tournament name and href if the batch has a tournament parent.
 */
function getTournamentInfo(batch: BatchOperation): { name: string; id: number; href: string } | null {
  if (!batch.tournamentName) return null;
  const tournamentBreakdown = batch.entityBreakdown.find(
    (b) => b.entityType === AuditEntityType.Tournament
  );
  if (!tournamentBreakdown || tournamentBreakdown.groups.length === 0) return null;
  const id = tournamentBreakdown.groups[0].sampleReferenceIdLock;
  return { name: batch.tournamentName, id, href: `/tournaments/${id}` };
}

/** Lazy-loaded entity ID list for the expanded view */
function BatchEntityIdList({ batch }: { batch: BatchOperation }) {
  const { data, isLoading } = useSWR(
    [
      'batch-entity-ids',
      batch.actionUserId,
      batch.earliestCreated,
      batch.latestCreated,
    ],
    () =>
      orpc.audit.batchEntityIds({
        actionUserId: batch.actionUserId,
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
    <div className="space-y-2 px-4 py-3">
      {sorted.map(({ entityType, ids }) => {
        if (ids.length === 0) return null;
        const meta = AuditEntityTypeEnumHelper.getMetadata(entityType);
        return (
          <div key={entityType}>
            <div className="text-muted-foreground mb-1 text-xs font-medium">
              {pluralize(meta.text, ids.length)} ({ids.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ids.map((id) => (
                <Link
                  key={id}
                  href={entityHref(entityType, id)}
                  className="bg-muted/50 text-muted-foreground hover:text-primary hover:bg-muted inline-block rounded px-1.5 py-0.5 text-xs transition-colors"
                >
                  #{id}
                </Link>
              ))}
            </div>
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
  const childEntityDescription = tournamentInfo
    ? buildEntityDescription(batch, AuditEntityType.Tournament)
    : '';

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
                  <>
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
                    {batch.type === 'submission' ? (
                      childEntityDescription && (
                        <span className="text-muted-foreground">
                          ({childEntityDescription})
                        </span>
                      )
                    ) : (
                      batch.entityBreakdown.length > 1 && (
                        <span className="text-muted-foreground">
                          ({entityDescription})
                        </span>
                      )
                    )}
                  </>
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
            <BatchEntityIdList batch={batch} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
