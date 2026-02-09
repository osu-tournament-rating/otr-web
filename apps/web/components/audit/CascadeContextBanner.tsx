'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import { AuditEntityType } from '@otr/core/osu';
import type { AuditEventAction } from '@/lib/orpc/schema/audit';

type CascadeContext = {
  topEntityType: AuditEntityType;
  topEntityId: number;
  topEntityName: string | null;
  action: AuditEventAction;
  childSummary: string | null;
};

type CascadeContextBannerProps = {
  context: CascadeContext;
};

function entityTypeToSlug(entityType: AuditEntityType): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return 'tournaments';
    case AuditEntityType.Match:
      return 'matches';
    case AuditEntityType.Game:
      return 'games';
    case AuditEntityType.Score:
      return 'scores';
  }
}

const ACTION_LABELS: Record<AuditEventAction, string> = {
  verification: 'verification',
  rejection: 'rejection',
  pre_verification: 'pre-verification',
  pre_rejection: 'pre-rejection',
  submission: 'submission',
  update: 'update',
  deletion: 'deletion',
};

export default function CascadeContextBanner({
  context,
}: CascadeContextBannerProps): React.JSX.Element {
  const slug = entityTypeToSlug(context.topEntityType);
  const entityName = context.topEntityName ?? `#${context.topEntityId}`;
  const actionLabel = ACTION_LABELS[context.action];

  return (
    <div className="flex items-start gap-2 rounded border-l-2 border-l-blue-400 bg-blue-50/50 px-3 py-2 text-xs dark:bg-blue-900/10">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
      <span className="text-muted-foreground">
        Part of{' '}
        <Link
          href={`/audit/${slug}/${context.topEntityId}`}
          className="text-primary font-medium hover:underline"
        >
          {entityName}
        </Link>
        {' '}{actionLabel}
        {context.childSummary && (
          <> &mdash; {context.childSummary}</>
        )}
      </span>
    </div>
  );
}
