'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type * as React from 'react';
import { AuditEntityType, VerificationStatus } from '@otr/core/osu';

import {
  IconButton,
  type IconButtonProps,
} from '@/components/kit/controls/IconButton';
import {
  AuditChangeList,
  AuditFieldChange,
} from '@/components/kit/format/AuditFieldChange';
import {
  VerificationStatusGlyph,
  VerificationStatusIcon,
} from '@/components/kit/status/VerificationStatusIcon';
import { OsuAvatar } from '@/components/ui/osu-avatar';
import type {
  AuditActionUser,
  AuditEventAction,
} from '@/lib/orpc/schema/audit';
import type { FormattedAuditValue } from '@/lib/kit/format/audit';
import { cn } from '@/lib/utils';

/**
 * A name that stands on its own line, such as an affected entity: plain
 * weight and the text colour at rest, blue with an underline on hover.
 */
export const AUDIT_INLINE_LINK =
  'rounded-sm text-foreground transition-colors outline-none hover:text-link hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50';

/**
 * A name inside a sentence. It shares the text's colour and weight, so a
 * faint underline is what marks it as a link (WCAG 1.4.1), as in Callout.
 */
export const AUDIT_SENTENCE_LINK = cn(
  AUDIT_INLINE_LINK,
  'underline decoration-muted-foreground/50 underline-offset-[3px] hover:decoration-current'
);

export function AuditInlineLink({
  href,
  inSentence = false,
  className,
  children,
}: {
  href: string;
  /** Underlined, for a name in running text. */
  inSentence?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        inSentence ? AUDIT_SENTENCE_LINK : AUDIT_INLINE_LINK,
        className
      )}
    >
      {children}
    </Link>
  );
}

/** Who made the change: their avatar and name as one link, or "System". */
export function AuditActor({
  user,
  fallback,
}: {
  user: AuditActionUser | null;
  /** "System" for automated changes, "Unknown" when the user is gone. */
  fallback: string;
}) {
  if (!user) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }

  const name = user.username ?? `User ${user.id}`;
  // Inline, not flex, so the name sits on the sentence's baseline and wraps
  // with it; the avatar is centred on the line.
  const avatar = user.osuId ? (
    <span aria-hidden="true" className="mr-1.5 inline-flex align-[-0.3125rem]">
      <OsuAvatar osuId={user.osuId} username={user.username} size={20} />
    </span>
  ) : null;

  if (user.playerId) {
    // Like EntityLink, the avatar sits inside the name's link; in a sentence
    // the name keeps plain weight and an underline marks the link.
    return (
      <Link
        href={`/players/${user.playerId}`}
        prefetch={false}
        className={AUDIT_SENTENCE_LINK}
      >
        {avatar}
        {name}
      </Link>
    );
  }

  return (
    <span>
      {avatar}
      {name}
    </span>
  );
}

/** The status an event leaves behind, for its one status icon. */
const ACTION_STATUS: Partial<Record<AuditEventAction, VerificationStatus>> = {
  verification: VerificationStatus.Verified,
  pre_verification: VerificationStatus.PreVerified,
  rejection: VerificationStatus.Rejected,
  pre_rejection: VerificationStatus.PreRejected,
};

/**
 * The column every audit row starts with: the status icon for a
 * verification event, empty for anything else, so the sentences line up.
 */
export function AuditStatusSlot({
  action,
  icon,
}: {
  action?: AuditEventAction;
  /** A muted glyph for rows that are not changes, such as admin notes. */
  icon?: React.ReactNode;
}) {
  const status = action ? ACTION_STATUS[action] : undefined;

  return (
    <span className="flex h-5 w-4 shrink-0 items-center justify-center">
      {status !== undefined ? (
        <VerificationStatusIcon status={status} tooltip="tap" />
      ) : (
        icon
      )}
    </span>
  );
}

/**
 * One row's first line: the status column, the sentence, the time (under
 * the sentence on phones) and the expand button, or a spacer in its place so
 * the times line up.
 */
export function AuditRowLine({
  action,
  icon,
  sentence,
  meta,
  toggle,
  sentenceTestId,
}: {
  action?: AuditEventAction;
  icon?: React.ReactNode;
  sentence: React.ReactNode;
  /** The time, and any short note before it. */
  meta: React.ReactNode;
  toggle?: React.ReactNode;
  sentenceTestId?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <AuditStatusSlot action={action} icon={icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-4">
        <p
          data-testid={sentenceTestId}
          className="min-w-0 flex-1 text-sm leading-5 [overflow-wrap:anywhere]"
        >
          {sentence}
        </p>
        {/* The time ticks in place, so its digits keep their width. */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 text-xs leading-5 text-muted-foreground tabular-nums">
          {meta}
        </div>
      </div>
      {toggle ?? (
        <span aria-hidden="true" className="-my-1.5 size-8 shrink-0" />
      )}
    </div>
  );
}

/**
 * The button that opens a row's details. Put it inside `CollapsibleTrigger
 * asChild`, which supplies `aria-expanded` and the open state. The turned
 * chevron shows an open row; the ghost fill stays a hover cue, so the many
 * rows that open on their own don't each carry a filled square.
 */
export function AuditRowToggle({
  open,
  className,
  ...props
}: Omit<IconButtonProps, 'label' | 'icon'> & { open: boolean }) {
  return (
    <IconButton
      label={open ? 'Hide details' : 'Show details'}
      icon={ChevronDown}
      className={cn(
        '-my-1.5 shrink-0 [&_svg]:transition-transform data-[state=open]:[&_svg]:rotate-180',
        'data-[state=open]:bg-transparent data-[state=open]:text-muted-foreground data-[state=open]:hover:bg-accent data-[state=open]:hover:text-accent-foreground',
        className
      )}
      {...props}
    />
  );
}

/** A row's details, indented to the sentence. */
export function AuditRowDetails({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-3 flex flex-col gap-3 pl-7', className)}
      {...props}
    />
  );
}

type ReferencedUsers = Record<string, { username: string | null }>;

/** A verification status keeps its glyph beside its name in a diff. */
function renderStatusValue(value: FormattedAuditValue): React.ReactNode {
  if (value.status === undefined) return value.text;

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <VerificationStatusGlyph status={value.status} className="size-3.5" />
      {value.text}
    </span>
  );
}

/** The changed fields of one entry, as the kit's audit diff lines. */
export function AuditChanges({
  entityType,
  changes,
  users,
  className,
}: {
  entityType: AuditEntityType;
  changes: Record<string, { originalValue: unknown; newValue: unknown }>;
  users?: ReferencedUsers;
  className?: string;
}) {
  return (
    <AuditChangeList data-testid="audit-diff" className={className}>
      {Object.entries(changes).map(([field, change]) => (
        <AuditFieldChange
          key={field}
          entityType={entityType}
          field={field}
          change={change}
          users={users}
          renderValue={renderStatusValue}
        />
      ))}
    </AuditChangeList>
  );
}

/** An entry's changes, typed for the diff, or null after a deletion. */
export function readChanges(
  changes: Record<string, unknown> | null | undefined
): Record<string, { originalValue: unknown; newValue: unknown }> | null {
  return (
    (changes as Record<
      string,
      { originalValue: unknown; newValue: unknown }
    > | null) ?? null
  );
}
