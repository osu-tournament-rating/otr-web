'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { ChevronRight, Info, Loader2 } from 'lucide-react';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';
import type {
  AuditEntry,
  CascadeContext,
  CascadeDescendant,
} from '@/lib/orpc/schema/audit';
import {
  entityTypeToSlug,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_PLURALS,
} from '@/lib/audit-entity-types';
import { ACTION_NOUNS } from '@/lib/audit-actions';
import { VerificationStatusEnumHelper } from '@/lib/enum-helpers';
import { orpc } from '@/lib/orpc/orpc';
import { Button } from '@/components/ui/button';
import VerificationBadge from '@/components/badges/VerificationBadge';
import { cn } from '@/lib/utils';
import ActionBreakdownPhrase from './ActionBreakdownPhrase';

type CascadeContextBannerProps = {
  context: CascadeContext;
  /** The entity whose page this renders on; a cascade it started reads as impact, not context. */
  viewedEntity?: { entityType: AuditEntityType; entityId: number };
};

const numberFormat = new Intl.NumberFormat('en-US');

function countLabel(descendant: CascadeDescendant): React.ReactNode {
  const { entityType, affectedCount, totalCount, actionBreakdown } = descendant;
  const showsTotal = totalCount !== null && totalCount > affectedCount;
  const counted = showsTotal ? totalCount : affectedCount;
  const label =
    counted === 1
      ? ENTITY_TYPE_LABELS[entityType]
      : ENTITY_TYPE_PLURALS[entityType];
  const totalDisplay =
    counted === 1 ? label : `of ${numberFormat.format(counted)} ${label}`;

  if (actionBreakdown) {
    return (
      <>
        <ActionBreakdownPhrase breakdown={actionBreakdown} /> {totalDisplay}
      </>
    );
  }
  if (showsTotal) {
    return `${numberFormat.format(affectedCount)} ${totalDisplay}`;
  }
  return `${numberFormat.format(affectedCount)} ${label}`;
}

function entryStatus(entry: AuditEntry): VerificationStatus | null {
  const change = entry.changes?.verificationStatus as
    { newValue?: unknown } | undefined;
  const value = change?.newValue;
  if (typeof value !== 'number') return null;
  return value in VerificationStatusEnumHelper.metadata
    ? (value as VerificationStatus)
    : null;
}

type AffectedEntitiesResponse = {
  entries: AuditEntry[];
  nextCursor: number | null;
  hasMore: boolean;
};

function AffectedEntities({
  context,
  entityType,
}: {
  context: CascadeContext;
  entityType: AuditEntityType;
}): React.JSX.Element {
  const { data, size, setSize, isLoading, isValidating, error, mutate } =
    useSWRInfinite(
      (_index: number, previous: AffectedEntitiesResponse | null) => {
        if (previous && !previous.hasMore) return null;
        return [
          'cascade-affected-entities',
          context.eventId,
          context.actionUserId,
          context.created,
          entityType,
          previous?.nextCursor ?? null,
        ] as const;
      },
      async ([, eventId, actionUserId, created, type, cursor]) =>
        orpc.audit.eventDetails({
          eventId: eventId ?? undefined,
          actionUserId,
          created,
          entityType: type,
          cursor: cursor ?? undefined,
          limit: 50,
        }),
      {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 60_000,
      }
    );

  const pages = data ?? [];
  const entries = pages.flatMap((page) => page.entries);
  const hasMore = pages[pages.length - 1]?.hasMore ?? false;
  const slug = entityTypeToSlug(entityType);
  const label = ENTITY_TYPE_LABELS[entityType];

  return (
    <div className="mt-2 flex flex-col gap-1 border-t border-blue-400/20 pt-2">
      {isLoading && (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </span>
      )}

      {error && (
        <span className="flex items-center gap-2 text-destructive">
          Unable to load affected {ENTITY_TYPE_PLURALS[entityType]}.
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void mutate()}
            disabled={isValidating}
          >
            Retry
          </Button>
        </span>
      )}

      {entries.map((entry) => {
        const id = entry.referenceId ?? entry.referenceIdLock;
        const status = entryStatus(entry);
        return (
          <div key={entry.id} className="flex items-center gap-1.5">
            <span className="flex w-6 shrink-0 justify-center">
              {status !== null && (
                <VerificationBadge verificationStatus={status} />
              )}
            </span>
            <Link
              href={`/audit/${slug}/${id}`}
              className="text-primary hover:underline"
            >
              {entry.entityName ??
                `${label.charAt(0).toUpperCase()}${label.slice(1)} #${id}`}
            </Link>
          </div>
        );
      })}

      {hasMore && !error && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => setSize(size + 1)}
          disabled={isValidating}
        >
          {isValidating && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Load more
        </Button>
      )}
    </div>
  );
}

export default function CascadeContextBanner({
  context,
  viewedEntity,
}: CascadeContextBannerProps): React.JSX.Element {
  const [openLevel, setOpenLevel] = useState<AuditEntityType | null>(null);

  const slug = entityTypeToSlug(context.topEntityType);
  const entityName = context.topEntityName ?? `#${context.topEntityId}`;
  const actionLabel = ACTION_NOUNS[context.action];
  const startedHere =
    viewedEntity?.entityType === context.topEntityType &&
    viewedEntity.entityId === context.topEntityId;

  return (
    <div
      data-testid="cascade-context-banner"
      className="flex items-start gap-2 rounded border-l-2 border-l-blue-400 bg-blue-50/50 px-3 py-2 text-xs dark:bg-blue-900/10"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-muted-foreground">
          {startedHere ? (
            <>
              This {actionLabel} also affected
              {context.descendants.length === 0 && ' no children'}
            </>
          ) : (
            <>
              Part of{' '}
              <Link
                href={`/audit/${slug}/${context.topEntityId}`}
                className="font-medium text-primary hover:underline"
              >
                {entityName}
              </Link>{' '}
              {actionLabel}
              {context.descendants.length > 0 && ' — also affected'}
            </>
          )}
        </span>

        {context.descendants.length > 0 && (
          <div
            data-testid="cascade-impact-levels"
            className="mt-1 flex flex-wrap items-center gap-1.5"
          >
            {context.descendants.map((descendant) => {
              const isOpen = openLevel === descendant.entityType;
              return (
                <Button
                  key={descendant.entityType}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs font-normal"
                  onClick={() =>
                    setOpenLevel(isOpen ? null : descendant.entityType)
                  }
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform',
                      isOpen && 'rotate-90'
                    )}
                  />
                  {countLabel(descendant)}
                </Button>
              );
            })}
          </div>
        )}

        {openLevel !== null && (
          <AffectedEntities context={context} entityType={openLevel} />
        )}
      </div>
    </div>
  );
}
