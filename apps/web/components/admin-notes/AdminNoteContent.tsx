import { format } from 'date-fns';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { type AdminNotePreview } from '@/lib/orpc/schema/common';

export default function AdminNoteContent({
  note,
  authorLink = true,
  footerActions,
}: {
  note: AdminNotePreview;
  authorLink?: boolean;
  footerActions?: ReactNode;
}) {
  const author = note.adminUser.player;
  const authorName = (
    <span className="font-semibold text-primary">{author.username}</span>
  );

  return (
    <div className="flex min-w-0 flex-col">
      <p className="whitespace-pre-wrap text-foreground">{note.note}</p>
      <div className="flex items-end gap-2">
        <p className="text-sm text-muted-foreground">
          By{' '}
          {authorLink ? (
            <Link href={`/players/${author.id}`}>{authorName}</Link>
          ) : (
            authorName
          )}{' '}
          on {format(new Date(note.created), 'MMM dd, yyyy')}
        </p>
        {footerActions}
      </div>
    </div>
  );
}
