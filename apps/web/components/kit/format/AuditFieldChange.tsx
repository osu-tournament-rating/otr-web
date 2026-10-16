import type * as React from 'react';
import { ArrowRight } from 'lucide-react';
import type { AuditEntityType } from '@otr/core/osu';

import {
  type AuditReferencedUser,
  type FormattedAuditValue,
  formatAuditValue,
  getAuditFieldLabel,
} from '@/lib/kit/format/audit';
import { cn } from '@/lib/utils';

/** The list that holds an entry's field changes. */
export function AuditChangeList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDListElement>) {
  return <dl className={cn('flex flex-col gap-2', className)} {...props} />;
}

function Value({
  value,
  side,
  renderValue,
}: {
  value: FormattedAuditValue;
  side: 'old' | 'new';
  renderValue?: (
    value: FormattedAuditValue,
    side: 'old' | 'new'
  ) => React.ReactNode;
}) {
  if (value.empty) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">{value.text}</span>
        <span className="sr-only">No value</span>
      </span>
    );
  }

  const content = renderValue ? renderValue(value, side) : value.text;
  // Words such as "Pre-verified": tabular figures widen Inter's hyphen.
  const figures = /\d/.test(value.text) ? undefined : 'proportional-nums';

  return side === 'old' ? (
    <del
      className={cn(
        'text-muted-foreground decoration-muted-foreground/70',
        figures
      )}
    >
      {content}
    </del>
  ) : (
    <ins className={cn('text-foreground no-underline', figures)}>{content}</ins>
  );
}

/**
 * One changed field in an audit entry: its sentence-case label, the old
 * value muted and struck through, an arrow, and the new value. Mods,
 * timestamps, enums and user IDs are written out (`HD, HR`, `Jul 20, 2024,
 * 15:42 UTC`, `Verified`, a username). Use inside `AuditChangeList`.
 */
export function AuditFieldChange({
  entityType,
  field,
  change,
  users,
  renderValue,
  className,
}: {
  entityType: AuditEntityType;
  field: string;
  change: { originalValue: unknown; newValue: unknown };
  /** Names for the user IDs the entry references, keyed by ID. */
  users?: Record<string, AuditReferencedUser>;
  /** Replaces a value's text, for example to add a verification status icon. */
  renderValue?: (
    value: FormattedAuditValue,
    side: 'old' | 'new'
  ) => React.ReactNode;
  className?: string;
}) {
  const before = formatAuditValue(entityType, field, change.originalValue, {
    users,
  });
  const after = formatAuditValue(entityType, field, change.newValue, {
    users,
  });

  return (
    <div
      data-audit-field={field}
      className={cn(
        'grid gap-0.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline sm:gap-3',
        className
      )}
    >
      <dt className="text-xs font-medium text-muted-foreground">
        {getAuditFieldLabel(entityType, field)}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm [overflow-wrap:anywhere]">
        <Value value={before} side="old" renderValue={renderValue} />
        {/* The arrow wraps with the new value, never alone at a line end. */}
        <span className="flex min-w-0 items-baseline gap-x-1.5">
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 shrink-0 self-center text-muted-foreground"
          />
          <span className="sr-only">changed to</span>
          <Value value={after} side="new" renderValue={renderValue} />
        </span>
      </dd>
    </div>
  );
}
