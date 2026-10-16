'use client';

import { AdminNoteRouteTarget } from '@otr/core/osu';

import { cn } from '@/lib/utils';

import AdminNoteListItem from './AdminNoteListItem';
import { AdminNote } from './types';

/** An entity's admin notes as divided rows, newest as the server sends them. */
export default function AdminNotesList({
  entity,
  notes,
  className,
}: {
  entity: AdminNoteRouteTarget;
  notes: AdminNote[];
  className?: string;
}) {
  return (
    <ul
      aria-label="Admin notes"
      className={cn('flex flex-col divide-y', className)}
    >
      {notes.map((note) => (
        <li key={note.id} className="py-3 first:pt-0 last:pb-0">
          <AdminNoteListItem entity={entity} note={note} />
        </li>
      ))}
    </ul>
  );
}
