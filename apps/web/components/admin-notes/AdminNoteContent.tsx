import Link from 'next/link';
import { type ReactNode } from 'react';

import { DateText } from '@/components/kit/format/DateText';
import { type AdminNotePreview } from '@/lib/orpc/schema/common';

/**
 * One admin note: its text, then who wrote it and when, with any actions
 * (edit, delete) at the right of both lines, so a note with actions keeps
 * the same spacing as one without.
 */
export default function AdminNoteContent({
  note,
  authorLink = true,
  footerActions,
}: {
  note: AdminNotePreview;
  /** False inside another link or a tooltip, where a link cannot go. */
  authorLink?: boolean;
  footerActions?: ReactNode;
}) {
  const author = note.adminUser.player;

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm wrap-anywhere whitespace-pre-wrap text-foreground">
          {note.note}
        </p>
        <p className="min-w-0 text-xs text-muted-foreground">
          By{' '}
          {authorLink ? (
            <Link
              href={`/players/${author.id}`}
              className="font-medium text-foreground transition-colors hover:text-link"
            >
              {author.username}
            </Link>
          ) : (
            <span className="font-medium text-foreground">
              {author.username}
            </span>
          )}{' '}
          on <DateText date={note.created} />
        </p>
      </div>
      {footerActions ? (
        <div className="flex shrink-0 items-center gap-1">{footerActions}</div>
      ) : null}
    </div>
  );
}
